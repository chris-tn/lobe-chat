import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { KnowledgeBaseModel } from '@/database/models/knowledgeBase';
import { KnowledgeBaseSharingModel } from '@/database/models/knowledgeBaseSharing';
import { insertKnowledgeBasesSchema } from '@/database/schemas';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { adminAuth } from '@/libs/trpc/middleware/adminAuth';
import { type KnowledgeBaseItem, KnowledgeBaseItem } from '@/types/knowledgeBase';

const knowledgeBaseProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      knowledgeBaseModel: new KnowledgeBaseModel(ctx.serverDB, ctx.userId),
      knowledgeBaseSharingModel: new KnowledgeBaseSharingModel(ctx.serverDB, ctx.userId),
    },
  });
});

const adminKnowledgeBaseProcedure = authedProcedure
  .use(serverDatabase)
  .use(adminAuth)
  .use(async (opts) => {
    const { ctx } = opts;

    return opts.next({
      ctx: {
        knowledgeBaseModel: new KnowledgeBaseModel(ctx.serverDB, ctx.userId),
        knowledgeBaseSharingModel: new KnowledgeBaseSharingModel(ctx.serverDB, ctx.userId),
      },
    });
  });

export const knowledgeBaseRouter = router({
  addFilesToKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ ids: z.array(z.string()), knowledgeBaseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.knowledgeBaseModel.addFilesToKnowledgeBase(
          input.knowledgeBaseId,
          input.ids,
        );
      } catch (e: any) {
        // Check for PostgreSQL unique constraint violation (code 23505)
        const pgErrorCode = e?.cause?.cause?.code || e?.cause?.code || e?.code;
        if (pgErrorCode === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'FILE_ALREADY_IN_KNOWLEDGE_BASE',
          });
        }
        throw e;
      }
    }),

  createKnowledgeBase: adminKnowledgeBaseProcedure
    .input(
      z.object({
        avatar: z.string().optional(),
        description: z.string().optional(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const data = await ctx.knowledgeBaseModel.create({
        avatar: input.avatar,
        description: input.description,
        name: input.name,
      });

      return data?.id;
    }),

  getKnowledgeBaseById: knowledgeBaseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }): Promise<KnowledgeBaseItem | undefined> => {
      return ctx.knowledgeBaseModel.findById(input.id);
    }),

  // ******* Sharing Routes ******* //
  getKnowledgeBaseShareList: adminKnowledgeBaseProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.knowledgeBaseSharingModel.getKnowledgeBaseShareList(input.knowledgeBaseId);
    }),

  getKnowledgeBases: knowledgeBaseProcedure.query(async ({ ctx }): Promise<KnowledgeBaseItem[]> => {
    return ctx.knowledgeBaseModel.query();
  }),

  removeAllKnowledgeBases: knowledgeBaseProcedure.mutation(async ({ ctx }) => {
    return ctx.knowledgeBaseModel.deleteAll();
  }),

  removeFilesFromKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ ids: z.array(z.string()), knowledgeBaseId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.knowledgeBaseModel.removeFilesFromKnowledgeBase(input.knowledgeBaseId, input.ids);
    }),

  removeKnowledgeBase: knowledgeBaseProcedure
    .input(z.object({ id: z.string(), removeFiles: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.knowledgeBaseModel.delete(input.id);
    }),

  shareGlobalKnowledgeBase: adminKnowledgeBaseProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.knowledgeBaseSharingModel.shareGlobalKnowledgeBase(input.knowledgeBaseId);
    }),

  shareKnowledgeBase: adminKnowledgeBaseProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        targetUserIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.knowledgeBaseSharingModel.shareKnowledgeBase(
        input.knowledgeBaseId,
        input.targetUserIds,
      );
    }),

  unshareGlobalKnowledgeBase: adminKnowledgeBaseProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.knowledgeBaseSharingModel.unshareGlobalKnowledgeBase(input.knowledgeBaseId);
    }),

  unshareKnowledgeBase: adminKnowledgeBaseProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        targetUserIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.knowledgeBaseSharingModel.unshareKnowledgeBase(
        input.knowledgeBaseId,
        input.targetUserIds,
      );
    }),

  updateKnowledgeBase: knowledgeBaseProcedure
    .input(
      z.object({
        id: z.string(),
        value: insertKnowledgeBasesSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.knowledgeBaseModel.update(input.id, input.value);
    }),
});
