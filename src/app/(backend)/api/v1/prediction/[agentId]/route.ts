import { AGENT_RUNTIME_ERROR_SET, ChatCompletionErrorPayload } from '@lobechat/model-runtime';
import { ChatErrorType, UIChatMessage } from '@lobechat/types';
import debug from 'debug';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { LOADING_FLAT } from '@/const/message';
import { AgentModel } from '@/database/models/agent';
import { MessageModel } from '@/database/models/message';
import { SessionModel } from '@/database/models/session';
import { UserModel } from '@/database/models/user';
import { sessions } from '@/database/schemas';
import { getServerDB } from '@/database/server';
import { initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';

// StreamingResponse is a simple wrapper, we'll create it inline

const log = debug('flowise-api:prediction');

export const maxDuration = 300;

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
};

/**
 * Helper to create JSON response with CORS headers
 */
const jsonResponse = (data: any, status: number = 200) => {
  return NextResponse.json(data, {
    headers: corsHeaders,
    status,
  });
};

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
    status: 204,
  });
}

interface PredictionRequestBody {
  chatId?: string;
  overrideConfig?: {
    // JWT token from SSO
    [key: string]: any;
    aUser?: string;
  };
  question: string;
  streaming?: boolean;
}

/**
 * Convert UIChatMessage to OpenAI message format
 */
function convertToOpenAIMessages(messages: UIChatMessage[]): Array<{
  content: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  tool_call_id?: string;
  tool_calls?: any[];
}> {
  return messages
    .filter((msg) => msg.role !== 'tool' || msg.tool_call_id) // Filter out standalone tool messages
    .map((msg) => {
      const baseMessage: any = {
        content: msg.content || '',
        role:
          msg.role === 'tool'
            ? 'tool'
            : msg.role === 'system'
              ? 'system'
              : msg.role === 'user'
                ? 'user'
                : 'assistant',
      };

      if (msg.tool_call_id) baseMessage.tool_call_id = msg.tool_call_id;
      if (msg.tools && msg.tools.length > 0) {
        baseMessage.tool_calls = msg.tools.map((tool) => ({
          function: {
            arguments: tool.arguments || '{}',
            name: tool.apiName,
          },
          id: tool.id,
          type: 'function',
        }));
      }

      return baseMessage;
    });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  console.info('POST /api/v1/prediction/%s - Request received', agentId);

  try {
    // ============ 1. Parse request body ============ //
    const body = (await req.json()) as PredictionRequestBody;
    const { question, chatId, overrideConfig, streaming = true } = body;

    if (!question) {
      return jsonResponse({ error: 'question is required' }, 400);
    }

    // ============ 2. Authentication - Get user from email ============ //
    // Get email from overrideConfig.aUser
    const emailFromBody = overrideConfig?.aUser;

    if (!emailFromBody || typeof emailFromBody !== 'string') {
      return jsonResponse({ error: 'Email is required in overrideConfig.aUser' }, 400);
    }

    // Query user by email
    const serverDB = await getServerDB();
    const user = await UserModel.findByEmail(serverDB, emailFromBody);

    if (!user) {
      return jsonResponse({ error: 'User not found with the provided email' }, 404);
    }

    const userId = user.id;
    const jwtPayload: any = { userId };
    console.info('Authenticated via email: %s, userId: %s', emailFromBody, userId);

    const sessionModel = new SessionModel(serverDB, userId);
    const messageModel = new MessageModel(serverDB, userId);
    const agentModel = new AgentModel(serverDB, userId);

    // ============ 3. Validate agent and check access ============ //
    // First check if user has access to this agent
    const accessibleAgentIds = await agentModel.queryAccessibleAgentIds();
    console.info('User %s accessible agents: %O', userId, accessibleAgentIds);
    console.info('Requested agentId: %s', agentId);
    if (!accessibleAgentIds.includes(agentId)) {
      console.info('Agent %s not accessible to user %s', agentId, userId);
      return jsonResponse({ error: 'Agent not found or access denied' }, 404);
    }

    // Then get agent config
    const agentConfig = await agentModel.getAgentConfigById(agentId);
    if (!agentConfig) {
      return jsonResponse({ error: 'Agent not found' }, 404);
    }
    console.info('Found agent: %s', agentId);

    // ============ 4. Session Management with chatId ============ //
    let session: any = null;
    let sessionId: string;

    if (chatId) {
      // Find session by client_session
      session = await serverDB.query.sessions.findFirst({
        where: and(eq(sessions.clientSession, chatId), eq(sessions.userId, userId)),
      });

      if (session) {
        sessionId = session.id;
        console.info('Found existing session by chatId: %s', sessionId);
      } else {
        // Create new session with client_session
        session = await sessionModel.createSessionForExistingAgent(agentId);
        // Update session with client_session
        await serverDB
          .update(sessions)
          .set({ clientSession: chatId })
          .where(eq(sessions.id, session.id));
        sessionId = session.id;
        console.info('Created new session with chatId: %s', sessionId);
      }
    } else {
      // Create new session without chatId
      session = await sessionModel.createSessionForExistingAgent(agentId);
      sessionId = session.id;
      console.info('Created new session: %s', sessionId);
    }

    // ============ 5. Get conversation history ============ //
    const historyMessages = await messageModel.query(
      { sessionId },
      { postProcessUrl: async (path) => path || '' },
    );

    // ============ 6. Create user message ============ //
    const userMessage = await messageModel.create({
      content: question,
      role: 'user',
      sessionId,
      topicId: session?.topicId || undefined,
    });

    console.info('Created user message: %s', userMessage.id);

    // ============ 7. Create assistant message (loading) ============ //
    const assistantMessage = await messageModel.create({
      content: LOADING_FLAT,
      fromModel:
        agentConfig?.model && typeof agentConfig.model === 'string' ? agentConfig.model : undefined,
      fromProvider:
        agentConfig?.provider && typeof agentConfig.provider === 'string'
          ? agentConfig.provider
          : undefined,
      parentId: userMessage.id,
      role: 'assistant',
      sessionId,
      topicId: session?.topicId || undefined,
    });

    console.info('Created assistant message: %s', assistantMessage.id);

    // ============ 8. Prepare messages for chat completion ============ //
    const allMessages = [...historyMessages, userMessage as any];
    const openAIMessages = convertToOpenAIMessages(allMessages);

    // Apply overrideConfig to agent config
    const finalConfig = {
      ...agentConfig,
      ...overrideConfig,
    };
    delete finalConfig.aUser; // Remove JWT from config

    // ============ 9. Create model runtime and stream ============ //
    // Ensure non-null values with proper type guards
    const providerValue = finalConfig.provider ?? agentConfig?.provider ?? 'openai';
    const modelValue = finalConfig.model ?? agentConfig?.model ?? 'gpt-3.5-turbo';

    // Type guard to ensure string type and filter out null
    const provider: string =
      typeof providerValue === 'string' && providerValue !== null ? providerValue : 'openai';
    const model: string =
      typeof modelValue === 'string' && modelValue !== null ? modelValue : 'gpt-3.5-turbo';

    const modelRuntime = await initModelRuntimeWithUserPayload(provider, jwtPayload);

    // Remove model and provider from finalConfig to avoid null override
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { model: _model, provider: _provider, ...restConfig } = finalConfig;

    // Get params from config (params are nested in agentConfig)
    const params = (restConfig.params as any) || (agentConfig?.params as any) || {};

    // Get temperature from params or use default
    const temperature = params.temperature ?? 1;

    // Clean up restConfig to remove null values and incompatible properties
    const cleanedConfig: Partial<ChatStreamPayload> = {};

    // Handle plugins (from agentConfig.plugins, not params)
    if (
      restConfig.plugins !== null &&
      restConfig.plugins !== undefined &&
      Array.isArray(restConfig.plugins)
    ) {
      cleanedConfig.plugins = restConfig.plugins;
    }

    // Copy params properties (these are in params object)
    if (params.max_tokens !== null && params.max_tokens !== undefined) {
      cleanedConfig.max_tokens = params.max_tokens;
    }
    if (params.top_p !== null && params.top_p !== undefined) {
      cleanedConfig.top_p = params.top_p;
    }
    if (params.frequency_penalty !== null && params.frequency_penalty !== undefined) {
      cleanedConfig.frequency_penalty = params.frequency_penalty;
    }
    if (params.presence_penalty !== null && params.presence_penalty !== undefined) {
      cleanedConfig.presence_penalty = params.presence_penalty;
    }

    // Tools and tool_choice might be in restConfig or params
    if ((restConfig as any).tools !== null && (restConfig as any).tools !== undefined) {
      cleanedConfig.tools = (restConfig as any).tools;
    }
    if ((restConfig as any).tool_choice !== null && (restConfig as any).tool_choice !== undefined) {
      cleanedConfig.tool_choice = (restConfig as any).tool_choice;
    }

    const chatPayload: ChatStreamPayload = {
      messages: openAIMessages as any,
      model,
      provider,
      stream: streaming,
      temperature,
      ...cleanedConfig,
    };

    const streamResponse = await modelRuntime.chat(chatPayload, {
      signal: req.signal,
      user: userId,
    });

    // ============ 10. Transform stream to Flowise format and update message ============ //
    let accumulatedContent = '';
    let finalUsage: any = null;
    let toolCalls: any[] = [];
    let toolResults: any[] = [];
    let sourceDocuments: any[] = [];

    // Helper function to send Flowise format event
    const sendFlowiseEvent = (
      controller: ReadableStreamDefaultController<Uint8Array>,
      encoder: TextEncoder,
      event: string,
      data: any,
    ) => {
      controller.enqueue(
        encoder.encode(`data:${JSON.stringify({ event, data })}\n\n`),
      );
    };

    const flowiseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send agentFlowEvent INPROGRESS
        sendFlowiseEvent(controller, encoder, 'agentFlowEvent', 'INPROGRESS');

        try {
          const reader = streamResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let currentEventType = ''; // Track current event type from SSE

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;

              // Track event type for next data line
              if (line.startsWith('id:')) {
                // Skip id lines
                continue;
              }

              if (line.startsWith('event:')) {
                currentEventType = line.split('event:')[1].trim();
                continue;
              }

              if (line.startsWith('data:')) {
                const dataStr = line.split('data:')[1].trim();
                if (dataStr === '[DONE]') continue;

                try {
                  const data = JSON.parse(dataStr);

                  // Use tracked event type instead of checking data.type
                  switch (currentEventType) {
                    case 'text': {
                      // data is the text content directly (e.g., "Hello")
                      const textContent = typeof data === 'string' ? data : data.data || data;
                      if (textContent) {
                        accumulatedContent += textContent;
                        // Send token event in Flowise format
                        sendFlowiseEvent(controller, encoder, 'token', textContent);
                      }
                      break;
                    }
                    case 'usage': {
                      // data is the usage object directly
                      finalUsage = data;
                      // Send usageMetadata event in Flowise format
                      sendFlowiseEvent(controller, encoder, 'usageMetadata', data);
                      break;
                    }
                    case 'stop': {
                      // Update assistant message with full content
                      await messageModel.update(assistantMessage.id, {
                        content: accumulatedContent,
                        error: null,
                      });

                      // Extract tool results and source documents from messages
                      const allMessages = await messageModel.query(
                        { sessionId },
                        { postProcessUrl: async (path) => path || '' },
                      );

                      // Find tool messages (messages with role='tool')
                      const toolMessages = allMessages.filter((msg: any) => msg.role === 'tool');

                      if (toolMessages.length > 0) {
                        // Capture toolCalls to avoid closure issue
                        const capturedToolCalls = toolCalls;
                        toolResults = toolMessages.map((toolMsg: any) => {
                          let toolOutput = toolMsg.content;
                          try {
                            // Try to parse as JSON
                            const parsed = JSON.parse(toolMsg.content);
                            toolOutput = parsed;
                          } catch {
                            // Keep as string if not JSON
                          }

                          // Extract source documents if available
                          if (toolOutput && typeof toolOutput === 'string') {
                            // Try to extract source documents from tool output
                            const sourceDocMatch = toolOutput.match(/<document_metadata>[\s\S]*?<\/document_metadata>/g);
                            if (sourceDocMatch) {
                              sourceDocuments.push(...sourceDocMatch.map((doc: string) => ({
                                pageContent: doc,
                                metadata: {},
                              })));
                            }
                          }

                          return {
                            tool: toolMsg.tool_call_id || toolMsg.name || 'unknown',
                            toolInput: capturedToolCalls.find((tc: any) => tc.id === toolMsg.tool_call_id)?.args || {},
                            toolOutput: toolOutput,
                          };
                        });

                        // Send usedTools event
                        if (toolResults.length > 0) {
                          sendFlowiseEvent(controller, encoder, 'usedTools', toolResults);
                        }

                        // Send sourceDocuments event if available
                        if (sourceDocuments.length > 0) {
                          sendFlowiseEvent(controller, encoder, 'sourceDocuments', sourceDocuments);
                        }
                      }

                      // Send calledTools event if empty (to match Flowise format)
                      if (toolCalls.length === 0) {
                        sendFlowiseEvent(controller, encoder, 'calledTools', '[]');
                      }

                      // Send agentFlowEvent FINISHED
                      sendFlowiseEvent(controller, encoder, 'agentFlowEvent', 'FINISHED');

                      // Send metadata event
                      sendFlowiseEvent(controller, encoder, 'metadata', {
                        chatId: chatId || null,
                        chatMessageId: assistantMessage.id,
                        question,
                        sessionId,
                      });

                      // Send end event
                      sendFlowiseEvent(controller, encoder, 'end', '[DONE]');
                      break;
                    }
                    case 'error': {
                      // Update message with error
                      await messageModel.update(assistantMessage.id, {
                        error: data,
                      });

                      sendFlowiseEvent(controller, encoder, 'error', data);
                      break;
                    }
                    case 'reasoning': {
                      // Handle reasoning/thinking content (skip for now)
                      break;
                    }
                    case 'tool_calls': {
                      // Handle tool calls - data is array of tool call chunks
                      if (Array.isArray(data)) {
                        toolCalls = data.map((toolCall: any) => ({
                          name: toolCall.function?.name || toolCall.name,
                          args: toolCall.function?.arguments
                            ? typeof toolCall.function.arguments === 'string'
                              ? JSON.parse(toolCall.function.arguments)
                              : toolCall.function.arguments
                            : toolCall.arguments || {},
                          id: toolCall.id,
                          type: toolCall.type || 'tool_call',
                        }));

                        // Send calledTools event
                        sendFlowiseEvent(
                          controller,
                          encoder,
                          'calledTools',
                          JSON.stringify(toolCalls),
                        );
                      }
                      break;
                    }
                    // No default - ignore unknown event types
                  }
                } catch {
                  log('Failed to parse SSE data:', dataStr);
                }

                // Reset event type after processing data
                currentEventType = '';
              }
            }
          }

          // If stream ended without stop event, update and send end
          if (accumulatedContent) {
            await messageModel.update(assistantMessage.id, {
              content: accumulatedContent,
              error: null,
            });

            // Extract tool results and source documents from messages
            const allMessages = await messageModel.query(
              { sessionId },
              { postProcessUrl: async (path) => path || '' },
            );

            // Find tool messages (messages with role='tool')
            const toolMessages = allMessages.filter((msg: any) => msg.role === 'tool');

            if (toolMessages.length > 0) {
              // Capture toolCalls to avoid closure issue
              const capturedToolCalls = toolCalls;
              toolResults = toolMessages.map((toolMsg: any) => {
                let toolOutput = toolMsg.content;
                try {
                  // Try to parse as JSON
                  const parsed = JSON.parse(toolMsg.content);
                  toolOutput = parsed;
                } catch {
                  // Keep as string if not JSON
                }

                // Extract source documents if available
                if (toolOutput && typeof toolOutput === 'string') {
                  // Try to extract source documents from tool output
                  const sourceDocMatch = toolOutput.match(/<document_metadata>[\s\S]*?<\/document_metadata>/g);
                  if (sourceDocMatch) {
                    sourceDocuments.push(...sourceDocMatch.map((doc: string) => ({
                      pageContent: doc,
                      metadata: {},
                    })));
                  }
                }

                return {
                  tool: toolMsg.tool_call_id || toolMsg.name || 'unknown',
                  toolInput: capturedToolCalls.find((tc: any) => tc.id === toolMsg.tool_call_id)?.args || {},
                  toolOutput: toolOutput,
                };
              });

              // Send usedTools event
              if (toolResults.length > 0) {
                sendFlowiseEvent(controller, encoder, 'usedTools', toolResults);
              }

              // Send sourceDocuments event if available
              if (sourceDocuments.length > 0) {
                sendFlowiseEvent(controller, encoder, 'sourceDocuments', sourceDocuments);
              }
            }

            // Send calledTools event if empty (to match Flowise format)
            if (toolCalls.length === 0) {
              sendFlowiseEvent(controller, encoder, 'calledTools', '[]');
            }

            // Send agentFlowEvent FINISHED
            sendFlowiseEvent(controller, encoder, 'agentFlowEvent', 'FINISHED');

            // Send usageMetadata if available
            if (finalUsage) {
              sendFlowiseEvent(controller, encoder, 'usageMetadata', finalUsage);
            }

            // Send metadata event
            sendFlowiseEvent(controller, encoder, 'metadata', {
              chatId: chatId || null,
              chatMessageId: assistantMessage.id,
              question,
              sessionId,
            });

            // Send end event
            sendFlowiseEvent(controller, encoder, 'end', '[DONE]');
          }
        } catch (error) {
          log('Stream error:', error);
          await messageModel.update(assistantMessage.id, {
            error: {
              message: (error as Error).message,
              type: ChatErrorType.InternalServerError,
            },
          });

          sendFlowiseEvent(controller, encoder, 'error', {
            message: (error as Error).message,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(flowiseStream, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
        'X-Accel-Buffering': 'no',
        ...corsHeaders,
      },
    });
  } catch (e) {
    log('Error in POST /api/v1/prediction: %O', e);

    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    if (AGENT_RUNTIME_ERROR_SET.has(errorType as string)) {
      console.warn(`Flowise API [${agentId || 'unknown'}] ${errorType}:`, error);
    } else {
      console.error(`Flowise API [${agentId || 'unknown'}] ${errorType}:`, error);
    }

    const errorResponse = createErrorResponse(errorType, { error, ...res, provider: 'unknown' });
    // Add CORS headers to error response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      errorResponse.headers.set(key, value);
    });
    return errorResponse;
  }
}
