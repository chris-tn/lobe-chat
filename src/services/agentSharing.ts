import { lambdaClient } from '@/libs/trpc/client';

export class AgentSharingService {
  /**
   * Get all agents shared with the current user
   */
  async getSharedAgents() {
    return lambdaClient.agentSharing.getSharedAgents.query();
  }

  /**
   * Get list of users an agent is shared with (admin only)
   */
  async getAgentShareList(agentId: string) {
    return lambdaClient.agentSharing.getAgentShareList.query({ agentId });
  }

  /**
   * Share an agent with specific users (admin only)
   */
  async shareAgent(agentId: string, userIds: string[]) {
    return lambdaClient.agentSharing.shareAgent.mutate({ agentId, userIds });
  }

  /**
   * Share an agent globally with all users (admin only)
   */
  async shareGlobalAgent(agentId: string) {
    return lambdaClient.agentSharing.shareGlobalAgent.mutate({ agentId });
  }

  /**
   * Unshare an agent from a specific user (admin only)
   */
  async unshareAgent(agentId: string, userId: string) {
    return lambdaClient.agentSharing.unshareAgent.mutate({ agentId, userId });
  }

  /**
   * Remove global sharing for an agent (admin only)
   */
  async unshareGlobalAgent(agentId: string) {
    return lambdaClient.agentSharing.unshareGlobalAgent.mutate({ agentId });
  }

  /**
   * Remove all shares for an agent (admin only)
   */
  async unshareAgentAll(agentId: string) {
    return lambdaClient.agentSharing.unshareAgentAll.mutate({ agentId });
  }

  /**
   * Get all chat groups shared with the current user
   */
  async getSharedChatGroups() {
    return lambdaClient.chatGroupSharing.getSharedChatGroups.query();
  }

  /**
   * Get list of users a chat group is shared with (admin only)
   */
  async getChatGroupShareList(chatGroupId: string) {
    return lambdaClient.chatGroupSharing.getChatGroupShareList.query({ chatGroupId });
  }

  /**
   * Share a chat group with specific users (admin only)
   */
  async shareChatGroup(chatGroupId: string, userIds: string[]) {
    return lambdaClient.chatGroupSharing.shareChatGroup.mutate({ chatGroupId, userIds });
  }

  /**
   * Share a chat group globally with all users (admin only)
   */
  async shareGlobalChatGroup(chatGroupId: string) {
    return lambdaClient.chatGroupSharing.shareGlobalChatGroup.mutate({ chatGroupId });
  }

  /**
   * Unshare a chat group from a specific user (admin only)
   */
  async unshareChatGroup(chatGroupId: string, userId: string) {
    return lambdaClient.chatGroupSharing.unshareChatGroup.mutate({ chatGroupId, userId });
  }

  /**
   * Remove global sharing for a chat group (admin only)
   */
  async unshareGlobalChatGroup(chatGroupId: string) {
    return lambdaClient.chatGroupSharing.unshareGlobalChatGroup.mutate({ chatGroupId });
  }

  /**
   * Remove all shares for a chat group (admin only)
   */
  async unshareChatGroupAll(chatGroupId: string) {
    return lambdaClient.chatGroupSharing.unshareChatGroupAll.mutate({ chatGroupId });
  }
}

export const agentSharingService = new AgentSharingService();
