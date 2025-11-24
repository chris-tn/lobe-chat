import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { agents } from '@/database/schemas';
import { getServerDB } from '@/database/server';

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

    // Check if agentId exists
    // This endpoint doesn't require authentication, but we validate the agent exists
    const agent = await serverDB.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { headers: corsHeaders, status: 404 });
    }

    // Return streaming status
    return NextResponse.json({ isStreaming: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error checking streaming status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { headers: corsHeaders, status: 500 },
    );
  }
}
