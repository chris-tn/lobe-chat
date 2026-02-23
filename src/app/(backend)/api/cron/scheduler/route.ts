import { NextRequest, NextResponse } from 'next/server';

import { getServerDB } from '@/database/core/db-adaptor';

/**
 * Cron endpoint to trigger pending schedules
 * This endpoint should be called periodically (e.g., via cron job or scheduled task)
 *
 * Security: Uses CRON_SECRET_TOKEN for authentication
 * Example: /api/cron/scheduler?secret=YOUR_SECRET_TOKEN
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add secret token validation
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET_TOKEN;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get scheduler MCP server URL from environment
    const schedulerMcpUrl = process.env.SCHEDULER_MCP_SERVER_URL || 'http://localhost:8000';

    // Call scheduler MCP server to get pending schedules and trigger them
    const response = await fetch(`${schedulerMcpUrl}/trigger-pending`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error calling scheduler MCP server:', errorText);
      return NextResponse.json(
        {
          error: 'Failed to trigger schedules',
          details: errorText,
        },
        { status: response.status },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      triggered: result.triggered || 0,
      failed: result.failed || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in scheduler cron:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 },
    );
  }
}

// Also support POST for flexibility
export const POST = GET;






