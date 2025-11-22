import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { agents } from '@/database/schemas';
import { getServerDB } from '@/database/server';

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
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Return streaming status
    return NextResponse.json({ isStreaming: true });
  } catch (error) {
    console.error('Error checking streaming status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
