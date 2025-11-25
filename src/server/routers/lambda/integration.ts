import { z } from 'zod';

import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { IntegrationService } from '@/server/services/integration';
import { IntegrationSyncService } from '@/server/services/integration/sync';

const integrationProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      integrationService: new IntegrationService(ctx.serverDB, ctx.userId),
      integrationSyncService: new IntegrationSyncService(ctx.serverDB, ctx.userId),
    },
  });
});

// Schema for Nextcloud config
const nextcloudConfigSchema = z.object({
  folderPath: z.string().default('/'),
  password: z.string().min(1, 'Password is required'),
  url: z.string().url('Invalid URL'),
  username: z.string().min(1, 'Username is required'),
});

// Schema for creating integration
const createIntegrationSchema = z.object({
  config: nextcloudConfigSchema,
  description: z.string().optional(),
  knowledgeBaseId: z.string(),
  name: z.string().min(1, 'Name is required'),
  syncEnabled: z.boolean().default(true),
  syncInterval: z.number().int().positive().default(3600),
  type: z.literal('nextcloud'), // seconds
});

// Schema for updating integration
const updateIntegrationSchema = z.object({
  config: nextcloudConfigSchema.optional(),
  description: z.string().optional(),
  id: z.string(),
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
  syncEnabled: z.boolean().optional(),
  syncInterval: z.number().int().positive().optional(),
});

export const integrationRouter = router({
  /**
   * Create a new integration
   */
  create: integrationProcedure.input(createIntegrationSchema).mutation(async ({ input, ctx }) => {
    return ctx.integrationService.createIntegration(input);
  }),

  /**
   * Delete integration
   */
  delete: integrationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.integrationService.deleteIntegration(input.id);
      return { success: true };
    }),

  /**
   * Get integration by ID
   */
  getById: integrationProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const integration = await ctx.integrationService.getIntegrationById(input.id);
      if (!integration) {
        throw new Error('Integration not found');
      }
      return integration;
    }),

  /**
   * Get integrations by knowledge base ID
   */
  getByKnowledgeBaseId: integrationProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.integrationService.getIntegrationsByKnowledgeBaseId(input.knowledgeBaseId);
    }),

  /**
   * Get sync status for an integration
   */
  getSyncStatus: integrationProcedure
    .input(z.object({ id: z.string(), limit: z.number().int().positive().default(10).optional() }))
    .query(async ({ ctx, input }) => {
      const { IntegrationModel } = await import('@/database/models/integration');
      const integrationModel = new IntegrationModel(ctx.serverDB, ctx.userId);
      const integration = await integrationModel.findById(input.id);
      if (!integration) {
        throw new Error('Integration not found');
      }

      const syncs = await integrationModel.getSyncs(input.id, input.limit || 10);
      const latestSync = await integrationModel.getLatestSync(input.id);

      return {
        integration: {
          errorMessage: integration.errorMessage,
          lastSyncAt: integration.lastSyncAt,
          lastSyncStatus: integration.lastSyncStatus,
        },
        latestSync,
        syncHistory: syncs,
      };
    }),

  /**
   * Get all integrations for the user
   */
  list: integrationProcedure.query(async ({ ctx }) => {
    return ctx.integrationService.getIntegrations();
  }),

  /**
   * Trigger manual sync
   */
  sync: integrationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.integrationSyncService.syncIntegration(input.id);
      return result;
    }),

  /**
   * Test integration connection
   */
  testConnection: integrationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isValid = await ctx.integrationService.testIntegration(input.id);
      return { valid: isValid };
    }),

  /**
   * Update integration
   */
  update: integrationProcedure.input(updateIntegrationSchema).mutation(async ({ input, ctx }) => {
    const { id, ...updates } = input;
    return ctx.integrationService.updateIntegration(id, updates);
  }),
});
