import { and, eq, or } from 'drizzle-orm';

import {
  AgentShareItem,
  ChatGroupShareItem,
  NewAgentShare,
  NewChatGroupShare,
  agentShares,
  chatGroupShares,
} from '../schemas';
import { LobeChatDatabase } from '../type';
import { PluginModel } from './plugin';

/**
 * Helper function to copy all plugins from agent owner to target users
 * Copies both regular plugins and custom plugins that are used by the agent
 */
async function copyPluginsFromAgent(
  db: LobeChatDatabase,
  agentId: string,
  targetUserIds: string[],
): Promise<void> {
  // 1. Get agent to find owner and plugins
  const { agents } = await import('../schemas');
  const agent = await db.query.agents.findFirst({
    columns: { plugins: true, userId: true },
    where: eq(agents.id, agentId),
  });

  if (!agent || !agent.plugins || agent.plugins.length === 0) {
    return;
  }

  // 2. Get owner's installed plugins
  const ownerPluginModel = new PluginModel(db, agent.userId);
  const ownerPlugins = await ownerPluginModel.query();

  // Filter plugins that are in agent's plugins list (both regular and custom plugins, exclude builtin)
  const pluginsToCopy = ownerPlugins.filter(
    (plugin) =>
      agent.plugins?.includes(plugin.identifier) &&
      (plugin.type === 'plugin' || plugin.type === 'customPlugin'),
  );

  if (pluginsToCopy.length === 0) {
    return;
  }

  // 3. Copy each plugin to target users
  for (const targetUserId of targetUserIds) {
    const targetPluginModel = new PluginModel(db, targetUserId);

    for (const plugin of pluginsToCopy) {
      // Check if plugin already exists for target user
      const existingPlugin = await targetPluginModel.findById(plugin.identifier);

      if (!existingPlugin) {
        // Copy the plugin with its original type (plugin or customPlugin)
        await targetPluginModel.create({
          customParams: plugin.customParams,
          identifier: plugin.identifier,
          manifest: plugin.manifest,
          settings: plugin.settings,
          type: plugin.type as 'plugin' | 'customPlugin',
        });
      }
    }
  }
}

export class AgentSharingModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // ******* Query Methods ******* //

  /**
   * Get all agents shared with the current user
   * Includes both globally shared agents and agents shared specifically with this user
   */
  async getSharedAgents(): Promise<AgentShareItem[]> {
    return this.db.query.agentShares.findMany({
      where: or(eq(agentShares.isGlobal, true), eq(agentShares.sharedWithUserId, this.userId)),
    });
  }

  /**
   * Get list of users an agent is shared with
   * Admin-only: checks if current user is the sharer
   */
  async getAgentShareList(agentId: string) {
    const { users } = await import('../schemas');

    const shares = await this.db
      .select({
        accessedAt: agentShares.accessedAt,
        agentId: agentShares.agentId,
        createdAt: agentShares.createdAt,
        id: agentShares.id,
        isGlobal: agentShares.isGlobal,
        permissions: agentShares.permissions,
        sharedByUserId: agentShares.sharedByUserId,
        sharedWithUserId: agentShares.sharedWithUserId,
        updatedAt: agentShares.updatedAt,
        userEmail: users.email,
        userFullName: users.fullName,
      })
      .from(agentShares)
      .leftJoin(users, eq(agentShares.sharedWithUserId, users.id))
      .where(and(eq(agentShares.agentId, agentId), eq(agentShares.sharedByUserId, this.userId)));

    return shares;
  }

  /**
   * Check if an agent is shared with a specific user
   */
  async isAgentSharedWith(agentId: string, userId: string): Promise<boolean> {
    const share = await this.db.query.agentShares.findFirst({
      where: and(
        eq(agentShares.agentId, agentId),
        or(eq(agentShares.isGlobal, true), eq(agentShares.sharedWithUserId, userId)),
      ),
    });
    return !!share;
  }

  /**
   * Get all agent IDs that are accessible to the current user
   * Priority: global shares first, then user-specific shares
   */
  async getAccessibleAgentIds(): Promise<string[]> {
    // Step 1: Get global shares first
    const globalShares = await this.db
      .select({ agentId: agentShares.agentId })
      .from(agentShares)
      .where(eq(agentShares.isGlobal, true));

    const globalAgentIds = new Set(globalShares.map((s) => s.agentId));
    console.log('[AgentSharing] Global agent IDs:', Array.from(globalAgentIds));

    // Step 2: Get user-specific shares
    const userShares = await this.db
      .select({ agentId: agentShares.agentId })
      .from(agentShares)
      .where(and(eq(agentShares.sharedWithUserId, this.userId), eq(agentShares.isGlobal, false)));

    console.log('[AgentSharing] User-specific shares:', userShares);

    // Step 3: Combine and deduplicate (global shares take priority)
    const allAgentIds = new Set([...globalAgentIds, ...userShares.map((s) => s.agentId)]);

    const result = Array.from(allAgentIds);
    console.log('[AgentSharing] Final accessible agent IDs for user', this.userId, ':', result);

    return result;
  }

  // ******* Create Methods ******* //

  /**
   * Share an agent with specific users (admin only)
   * Also copies all plugins (both regular and custom) from agent owner to target users
   */
  async shareAgent(agentId: string, targetUserIds: string[]): Promise<AgentShareItem[]> {
    // Copy plugins before creating share records
    await copyPluginsFromAgent(this.db, agentId, targetUserIds);

    const shares: NewAgentShare[] = targetUserIds.map((targetUserId) => ({
      agentId,
      isGlobal: false,
      sharedByUserId: this.userId,
      sharedWithUserId: targetUserId,
    }));

    return this.db.insert(agentShares).values(shares).returning();
  }

  /**
   * Share an agent globally with all users (admin only)
   * Also copies all plugins (both regular and custom) from agent owner to all existing users
   */
  async shareGlobalAgent(agentId: string): Promise<AgentShareItem> {
    // Get all users to copy plugins to
    const { users } = await import('../schemas');
    const allUsers = await this.db.select({ id: users.id }).from(users);

    const allUserIds = allUsers.map((u) => u.id).filter((id) => id !== this.userId);

    // Copy plugins to all users
    if (allUserIds.length > 0) {
      await copyPluginsFromAgent(this.db, agentId, allUserIds);
    }

    const [share] = await this.db
      .insert(agentShares)
      .values({
        agentId,
        isGlobal: true,
        sharedByUserId: this.userId,
        sharedWithUserId: null,
      })
      .returning();

    return share;
  }

  // ******* Delete Methods ******* //

  /**
   * Unshare an agent from a specific user (admin only)
   * Also deletes the user's sessions for this agent
   */
  async unshareAgent(agentId: string, targetUserId: string): Promise<void> {
    return this.db.transaction(async (trx) => {
      // 1. Delete the share record
      await trx
        .delete(agentShares)
        .where(
          and(
            eq(agentShares.agentId, agentId),
            eq(agentShares.sharedByUserId, this.userId),
            eq(agentShares.sharedWithUserId, targetUserId),
          ),
        );

      // 2. Find and delete sessions created for this agent by this user
      const { sessions, agentsToSessions } = await import('../schemas');

      // Find session IDs for this agent and user
      const agentSessions = await trx
        .select({ sessionId: agentsToSessions.sessionId })
        .from(agentsToSessions)
        .innerJoin(sessions, eq(agentsToSessions.sessionId, sessions.id))
        .where(and(eq(agentsToSessions.agentId, agentId), eq(sessions.userId, targetUserId)));

      const sessionIds = agentSessions.map((s) => s.sessionId);

      if (sessionIds.length > 0) {
        const { inArray } = await import('drizzle-orm');

        // Delete sessions (cascade will delete agentsToSessions)
        await trx.delete(sessions).where(inArray(sessions.id, sessionIds));
      }
    });
  }

  /**
   * Remove global sharing for an agent (admin only)
   * Also deletes all users' sessions for this agent (except owner)
   */
  async unshareGlobalAgent(agentId: string): Promise<void> {
    return this.db.transaction(async (trx) => {
      // 1. Delete the global share record
      await trx
        .delete(agentShares)
        .where(
          and(
            eq(agentShares.agentId, agentId),
            eq(agentShares.sharedByUserId, this.userId),
            eq(agentShares.isGlobal, true),
          ),
        );

      // 2. Find agent owner
      const { agents } = await import('../schemas');
      const agent = await trx.query.agents.findFirst({
        columns: { userId: true },
        where: eq(agents.id, agentId),
      });

      if (!agent) return;

      // 3. Find and delete all sessions for this agent (except owner's sessions)
      const { sessions, agentsToSessions } = await import('../schemas');
      const { ne } = await import('drizzle-orm');

      const agentSessions = await trx
        .select({ sessionId: agentsToSessions.sessionId })
        .from(agentsToSessions)
        .innerJoin(sessions, eq(agentsToSessions.sessionId, sessions.id))
        .where(
          and(
            eq(agentsToSessions.agentId, agentId),
            ne(sessions.userId, agent.userId), // Exclude owner's sessions
          ),
        );

      const sessionIds = agentSessions.map((s) => s.sessionId);

      if (sessionIds.length > 0) {
        const { inArray } = await import('drizzle-orm');

        // Delete sessions (cascade will delete agentsToSessions)
        await trx.delete(sessions).where(inArray(sessions.id, sessionIds));
      }
    });
  }

  /**
   * Remove all shares for an agent (admin only)
   */
  async unshareAgentAll(agentId: string): Promise<void> {
    await this.db
      .delete(agentShares)
      .where(and(eq(agentShares.agentId, agentId), eq(agentShares.sharedByUserId, this.userId)));
  }
}

export class ChatGroupSharingModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Copy all plugins from all agents in a chat group to target users
   */
  private async copyPluginsFromChatGroup(
    chatGroupId: string,
    targetUserIds: string[],
  ): Promise<void> {
    // 1. Get all agents in the chat group
    const { chatGroupsAgents } = await import('../schemas');
    const groupAgents = await this.db
      .select({ agentId: chatGroupsAgents.agentId })
      .from(chatGroupsAgents)
      .where(eq(chatGroupsAgents.chatGroupId, chatGroupId));

    if (groupAgents.length === 0) {
      return;
    }

    // 2. For each agent, copy all its plugins
    for (const { agentId } of groupAgents) {
      await copyPluginsFromAgent(this.db, agentId, targetUserIds);
    }
  }

  // ******* Query Methods ******* //

  /**
   * Get all chat groups shared with the current user
   * Includes both globally shared groups and groups shared specifically with this user
   */
  async getSharedChatGroups(): Promise<ChatGroupShareItem[]> {
    return this.db.query.chatGroupShares.findMany({
      where: or(
        eq(chatGroupShares.isGlobal, true),
        eq(chatGroupShares.sharedWithUserId, this.userId),
      ),
    });
  }

  /**
   * Get list of users a chat group is shared with
   * Admin-only: checks if current user is the sharer
   */
  async getChatGroupShareList(chatGroupId: string): Promise<ChatGroupShareItem[]> {
    return this.db.query.chatGroupShares.findMany({
      where: and(
        eq(chatGroupShares.chatGroupId, chatGroupId),
        eq(chatGroupShares.sharedByUserId, this.userId),
      ),
    });
  }

  /**
   * Check if a chat group is shared with a specific user
   */
  async isChatGroupSharedWith(chatGroupId: string, userId: string): Promise<boolean> {
    const share = await this.db.query.chatGroupShares.findFirst({
      where: and(
        eq(chatGroupShares.chatGroupId, chatGroupId),
        or(eq(chatGroupShares.isGlobal, true), eq(chatGroupShares.sharedWithUserId, userId)),
      ),
    });
    return !!share;
  }

  /**
   * Get all chat group IDs that are accessible to the current user
   * Priority: global shares first, then user-specific shares
   */
  async getAccessibleChatGroupIds(): Promise<string[]> {
    // Step 1: Get global shares first
    const globalShares = await this.db
      .select({ chatGroupId: chatGroupShares.chatGroupId })
      .from(chatGroupShares)
      .where(eq(chatGroupShares.isGlobal, true));

    const globalGroupIds = new Set(globalShares.map((s) => s.chatGroupId));

    // Step 2: Get user-specific shares
    const userShares = await this.db
      .select({ chatGroupId: chatGroupShares.chatGroupId })
      .from(chatGroupShares)
      .where(
        and(eq(chatGroupShares.sharedWithUserId, this.userId), eq(chatGroupShares.isGlobal, false)),
      );

    // Step 3: Combine and deduplicate (global shares take priority)
    const allGroupIds = new Set([...globalGroupIds, ...userShares.map((s) => s.chatGroupId)]);

    return Array.from(allGroupIds);
  }

  // ******* Create Methods ******* //

  /**
   * Share a chat group with specific users (admin only)
   * Also copies all plugins (both regular and custom) from all agents in the group to target users
   */
  async shareChatGroup(
    chatGroupId: string,
    targetUserIds: string[],
  ): Promise<ChatGroupShareItem[]> {
    // Copy plugins from all agents in the group before creating share records
    await this.copyPluginsFromChatGroup(chatGroupId, targetUserIds);

    const shares: NewChatGroupShare[] = targetUserIds.map((targetUserId) => ({
      chatGroupId,
      isGlobal: false,
      sharedByUserId: this.userId,
      sharedWithUserId: targetUserId,
    }));

    return this.db.insert(chatGroupShares).values(shares).returning();
  }

  /**
   * Share a chat group globally with all users (admin only)
   * Also copies all plugins (both regular and custom) from all agents in the group to all existing users
   */
  async shareGlobalChatGroup(chatGroupId: string): Promise<ChatGroupShareItem> {
    // Get all users to copy plugins to
    const { users } = await import('../schemas');
    const allUsers = await this.db.select({ id: users.id }).from(users);

    const allUserIds = allUsers.map((u) => u.id).filter((id) => id !== this.userId);

    // Copy plugins from all agents in the group to all users
    if (allUserIds.length > 0) {
      await this.copyPluginsFromChatGroup(chatGroupId, allUserIds);
    }

    const [share] = await this.db
      .insert(chatGroupShares)
      .values({
        chatGroupId,
        isGlobal: true,
        sharedByUserId: this.userId,
        sharedWithUserId: null,
      })
      .returning();

    return share;
  }

  // ******* Delete Methods ******* //

  /**
   * Unshare a chat group from a specific user (admin only)
   */
  async unshareChatGroup(chatGroupId: string, targetUserId: string): Promise<void> {
    await this.db
      .delete(chatGroupShares)
      .where(
        and(
          eq(chatGroupShares.chatGroupId, chatGroupId),
          eq(chatGroupShares.sharedByUserId, this.userId),
          eq(chatGroupShares.sharedWithUserId, targetUserId),
        ),
      );
  }

  /**
   * Remove global sharing for a chat group (admin only)
   */
  async unshareGlobalChatGroup(chatGroupId: string): Promise<void> {
    await this.db
      .delete(chatGroupShares)
      .where(
        and(
          eq(chatGroupShares.chatGroupId, chatGroupId),
          eq(chatGroupShares.sharedByUserId, this.userId),
          eq(chatGroupShares.isGlobal, true),
        ),
      );
  }

  /**
   * Remove all shares for a chat group (admin only)
   */
  async unshareChatGroupAll(chatGroupId: string): Promise<void> {
    await this.db
      .delete(chatGroupShares)
      .where(
        and(
          eq(chatGroupShares.chatGroupId, chatGroupId),
          eq(chatGroupShares.sharedByUserId, this.userId),
        ),
      );
  }
}
