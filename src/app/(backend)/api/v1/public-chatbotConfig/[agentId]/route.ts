import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { agents } from '@/database/schemas';
import { getServerDB } from '@/database/server';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  try {
    const serverDB = await getServerDB();

    // Check if agent exists
    const agent = await serverDB.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { headers: corsHeaders, status: 404 });
    }

    // Get agent config (we need a userId, but for public endpoint we can use the agent's owner)
    // However, AgentModel requires userId, so we'll query directly
    const agentConfig = await serverDB.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agentConfig) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { headers: corsHeaders, status: 404 },
      );
    }

    // Return public agent config (excluding sensitive information)
    const publicConfig = {
      avatar: agentConfig.avatar,
      backgroundColor: agentConfig.backgroundColor,
      chatConfig: agentConfig.chatConfig,
      description: agentConfig.description,
      id: agentConfig.id,
      model: agentConfig.model,
      openingMessage: agentConfig.openingMessage,
      openingQuestions: agentConfig.openingQuestions,
      params: agentConfig.params,
      plugins: agentConfig.plugins,
      provider: agentConfig.provider,
      systemRole: agentConfig.systemRole,
      title: agentConfig.title,
      tts: agentConfig.tts,
      virtual: agentConfig.virtual,
    };

    return NextResponse.json(publicConfig, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching public chatbot config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { headers: corsHeaders, status: 500 },
    );
  }
}
