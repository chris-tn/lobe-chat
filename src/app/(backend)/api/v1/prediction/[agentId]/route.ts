import {
  AGENT_RUNTIME_ERROR_SET,
  ChatCompletionErrorPayload,
} from '@lobechat/model-runtime';
import { ChatErrorType, UIChatMessage } from '@lobechat/types';
import debug from 'debug';
import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { LOBE_CHAT_OIDC_AUTH_HEADER } from '@/const/auth';
import { LOADING_FLAT } from '@/const/message';
import { AgentModel } from '@/database/models/agent';
import { MessageModel } from '@/database/models/message';
import { SessionModel } from '@/database/models/session';
import { sessions } from '@/database/schemas';
import { getServerDB } from '@/database/server';
import { validateOIDCJWT } from '@/libs/oidc-provider/jwt';
import { initModelRuntimeWithUserPayload } from '@/server/modules/ModelRuntime';
import { ChatStreamPayload } from '@/types/openai/chat';
import { createErrorResponse } from '@/utils/errorResponse';

// StreamingResponse is a simple wrapper, we'll create it inline

const log = debug('flowise-api:prediction');

export const maxDuration = 300;

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

  try {
    // ============ 1. Parse request body ============ //
    const body = (await req.json()) as PredictionRequestBody;
    const { question, chatId, overrideConfig, streaming = true } = body;

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    // ============ 2. Authentication - Priority: body > header ============ //
    let userId: string;
    let jwtPayload: any = {};

    // Try to get JWT from overrideConfig.aUser first (for embedded UI)
    const jwtFromBody = overrideConfig?.aUser;
    const jwtFromHeader = req.headers.get(LOBE_CHAT_OIDC_AUTH_HEADER);

    if (jwtFromBody) {
      try {
        const oidc = await validateOIDCJWT(jwtFromBody);
        userId = oidc.userId;
        jwtPayload = { ...jwtPayload, userId };
        log('Authenticated via JWT from body, userId: %s', userId);
      } catch (error) {
        log('JWT from body validation failed: %O', error);
        return NextResponse.json(
          { error: 'Invalid JWT token in overrideConfig.aUser' },
          { status: 401 },
        );
      }
    } else if (jwtFromHeader) {
      try {
        const oidc = await validateOIDCJWT(jwtFromHeader);
        userId = oidc.userId;
        jwtPayload = { ...jwtPayload, userId };
        log('Authenticated via JWT from header, userId: %s', userId);
      } catch (error) {
        log('JWT from header validation failed: %O', error);
        return NextResponse.json({ error: 'Invalid JWT token in header' }, { status: 401 });
      }
    } else {
      return NextResponse.json(
        {
          error: 'Authentication required: provide JWT in overrideConfig.aUser or Oidc-Auth header',
        },
        { status: 401 },
      );
    }

    const serverDB = await getServerDB();
    const sessionModel = new SessionModel(serverDB, userId);
    const messageModel = new MessageModel(serverDB, userId);
    const agentModel = new AgentModel(serverDB, userId);

    // ============ 3. Validate agent ============ //
    const agentConfig = await agentModel.getAgentConfigById(agentId);
    if (!agentConfig) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    log('Found agent: %s', agentId);

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
        log('Found existing session by chatId: %s', sessionId);
      } else {
        // Create new session with client_session
        session = await sessionModel.createSessionForExistingAgent(agentId);
        // Update session with client_session
        await serverDB
          .update(sessions)
          .set({ clientSession: chatId })
          .where(eq(sessions.id, session.id));
        sessionId = session.id;
        log('Created new session with chatId: %s', sessionId);
      }
    } else {
      // Create new session without chatId
      session = await sessionModel.createSessionForExistingAgent(agentId);
      sessionId = session.id;
      log('Created new session: %s', sessionId);
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

    log('Created user message: %s', userMessage.id);

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

    log('Created assistant message: %s', assistantMessage.id);

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

    const flowiseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Send start event
        controller.enqueue(
          encoder.encode(
            `event: start\ndata: ${JSON.stringify({ chatId: chatId || null, sessionId })}\n\n`,
          ),
        );

        try {
          const reader = streamResponse.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith('event:')) {
                // Parse event type but not used in current implementation
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const _eventType = line.split('event:')[1].trim();
                continue;
              }

              if (line.startsWith('data:')) {
                const dataStr = line.split('data:')[1].trim();
                if (dataStr === '[DONE]') continue;

                try {
                  const data = JSON.parse(dataStr);

                  if (data.type === 'text' && data.data) {
                    accumulatedContent += data.data;
                    // Send token event for Flowise
                    controller.enqueue(
                      encoder.encode(`event: token\ndata: ${JSON.stringify(data.data)}\n\n`),
                    );
                  } else switch (data.type) {
 case 'usage': {
                    finalUsage = data.data;
                  
 break;
 }
 case 'stop': {
                    // Update assistant message with full content
                    await messageModel.update(assistantMessage.id, {
                      content: accumulatedContent,
                      error: null,
                    });

                    // Send end event
                    controller.enqueue(
                      encoder.encode(
                        `event: end\ndata: ${JSON.stringify({ messageId: assistantMessage.id, usage: finalUsage || {} })}\n\n`,
                      ),
                    );
                  
 break;
 }
 case 'error': {
                    // Update message with error
                    await messageModel.update(assistantMessage.id, {
                      error: data.data,
                    });

                    controller.enqueue(
                      encoder.encode(`event: error\ndata: ${JSON.stringify(data.data)}\n\n`),
                    );
                  
 break;
 }
 // No default
 }
                } catch {
                  log('Failed to parse SSE data:', dataStr);
                }
              }
            }
          }

          // If stream ended without stop event, update and send end
          if (accumulatedContent) {
            await messageModel.update(assistantMessage.id, {
              content: accumulatedContent,
              error: null,
            });

            controller.enqueue(
              encoder.encode(
                `event: end\ndata: ${JSON.stringify({ messageId: assistantMessage.id, usage: finalUsage || {} })}\n\n`,
              ),
            );
          }
        } catch (error) {
          log('Stream error:', error);
          await messageModel.update(assistantMessage.id, {
            error: {
              message: (error as Error).message,
              type: ChatErrorType.InternalServerError,
            },
          });

          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: (error as Error).message })}\n\n`,
            ),
          );
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
      },
    });
  } catch (e) {
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = e as ChatCompletionErrorPayload;

    const error = errorContent || e;

    const logMethod = AGENT_RUNTIME_ERROR_SET.has(errorType as string) ? 'warn' : 'error';
    console[logMethod](`Flowise API [${agentId}] ${errorType}:`, error);

    return createErrorResponse(errorType, { error, ...res, provider: 'unknown' });
  }
}
