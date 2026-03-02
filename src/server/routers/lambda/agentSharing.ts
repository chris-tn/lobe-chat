import { z } from 'zod';

import { AgentSharingModel, ChatGroupSharingModel } from '@/database/models/agentSharing';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { adminAuth } from '@/libs/trpc/middleware/adminAuth';
import { userAuth } from '@/libs/trpc/middleware/userAuth';

// Procedure with admin auth and database access
const sharingProcedure = authedProcedure.use(serverDatabase).use(adminAuth);

// Regular user procedure with database access
const userProcedure = authedProcedure.use(serverDatabase).use(userAuth);

export const agentSharingRouter = router({
  /**
   * Get list of users an agent is shared with (admin only)
   */
  getAgentShareList: sharingProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.getAgentShareList(input.agentId);
    }),

  /**
   * Get all agents shared with the current user
   */
  getSharedAgents: userProcedure.query(async ({ ctx }) => {
    const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
    return sharingModel.getSharedAgents();
  }),

  /**
   * Share an agent with specific users (admin only)
   */
  shareAgent: sharingProcedure
    .input(
      z.object({
        agentId: z.string(),
        userIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.shareAgent(input.agentId, input.userIds);
    }),

  /**
   * Share an agent globally with all users (admin only)
   */
  shareGlobalAgent: sharingProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.shareGlobalAgent(input.agentId);
    }),

  /**
   * Unshare an agent from a specific user (admin only)
   */
  unshareAgent: sharingProcedure
    .input(
      z.object({
        agentId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareAgent(input.agentId, input.userId);
    }),

  /**
   * Remove all shares for an agent (admin only)
   */
  unshareAgentAll: sharingProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareAgentAll(input.agentId);
    }),

  /**
   * Remove global sharing for an agent (admin only)
   */
  unshareGlobalAgent: sharingProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new AgentSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareGlobalAgent(input.agentId);
    }),
});

export const chatGroupSharingRouter = router({
  /**
   * Get list of users a chat group is shared with (admin only)
   */
  getChatGroupShareList: sharingProcedure
    .input(z.object({ chatGroupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.getChatGroupShareList(input.chatGroupId);
    }),

  /**
   * Get all chat groups shared with the current user
   */
  getSharedChatGroups: userProcedure.query(async ({ ctx }) => {
    const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
    return sharingModel.getSharedChatGroups();
  }),

  /**
   * Share a chat group with specific users (admin only)
   */
  shareChatGroup: sharingProcedure
    .input(
      z.object({
        chatGroupId: z.string(),
        userIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.shareChatGroup(input.chatGroupId, input.userIds);
    }),

  /**
   * Share a chat group globally with all users (admin only)
   */
  shareGlobalChatGroup: sharingProcedure
    .input(z.object({ chatGroupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.shareGlobalChatGroup(input.chatGroupId);
    }),

  /**
   * Unshare a chat group from a specific user (admin only)
   */
  unshareChatGroup: sharingProcedure
    .input(
      z.object({
        chatGroupId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareChatGroup(input.chatGroupId, input.userId);
    }),

  /**
   * Remove all shares for a chat group (admin only)
   */
  unshareChatGroupAll: sharingProcedure
    .input(z.object({ chatGroupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareChatGroupAll(input.chatGroupId);
    }),

  /**
   * Remove global sharing for a chat group (admin only)
   */
  unshareGlobalChatGroup: sharingProcedure
    .input(z.object({ chatGroupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sharingModel = new ChatGroupSharingModel(ctx.serverDB, ctx.userId);
      return sharingModel.unshareGlobalChatGroup(input.chatGroupId);
    }),
});
