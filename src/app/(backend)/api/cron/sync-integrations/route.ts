import { NextRequest, NextResponse } from 'next/server';

import { getServerDB } from '@/database/core/db-adaptor';
import { IntegrationSyncService } from '@/server/services/integration/sync';

/**
 * Cron endpoint to sync all active integrations
 * This endpoint should be called periodically (e.g., via cron job or scheduled task)
 *
 * Security: Consider adding authentication (e.g., secret token in query param or header)
 * Example: /api/cron/sync-integrations?secret=YOUR_SECRET_TOKEN
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add secret token validation
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.INTEGRATION_SYNC_SECRET;

    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database connection
    const serverDB = await getServerDB();

    // Get all active integrations that need syncing
    // Note: We need to get integrations for all users, so we'll query directly
    const { integrations } = await import('@/database/schemas');
    const { eq, and } = await import('drizzle-orm');

    const activeIntegrations = await serverDB
      .select()
      .from(integrations)
      .where(and(eq(integrations.syncEnabled, true), eq(integrations.status, 'active')));

    const results = [];
    const errors = [];

    // Sync each integration
    for (const integration of activeIntegrations) {
      try {
        // Check if sync is needed based on interval
        if (integration.lastSyncAt && integration.syncInterval) {
          const lastSyncTime = new Date(integration.lastSyncAt).getTime();
          const now = Date.now();
          const timeSinceLastSync = (now - lastSyncTime) / 1000; // seconds

          if (timeSinceLastSync < integration.syncInterval) {
            results.push({
              integrationId: integration.id,
              integrationName: integration.name,
              reason: `Last sync was ${Math.floor(timeSinceLastSync)}s ago, interval is ${integration.syncInterval}s`,
              status: 'skipped',
            });
            continue;
          }
        }

        // Perform sync
        const syncService = new IntegrationSyncService(serverDB, integration.userId);
        const syncResult = await syncService.syncIntegration(integration.id);

        results.push({
          integrationId: integration.id,
          integrationName: integration.name,
          result: syncResult,
          status: 'success',
        });
      } catch (error) {
        errors.push({
          error: error instanceof Error ? error.message : String(error),
          integrationId: integration.id,
          integrationName: integration.name,
        });
      }
    }

    return NextResponse.json({
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      results,
      skipped: results.filter((r) => r.status === 'skipped').length,
      success: true,
      synced: results.filter((r) => r.status === 'success').length,
      timestamp: new Date().toISOString(),
      total: activeIntegrations.length,
    });
  } catch (error) {
    console.error('Error in sync-integrations cron:', error);
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
