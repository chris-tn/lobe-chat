import { and, eq, or } from 'drizzle-orm';

import {
  KnowledgeBaseShareItem,
  NewKnowledgeBaseShare,
  knowledgeBaseShares,
} from '../schemas/knowledgeBaseSharing';
import { LobeChatDatabase } from '../type';

export class KnowledgeBaseSharingModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // ******* Query Methods ******* //

  /**
   * Check if a knowledge base is shared with the user
   */
  async isKnowledgeBaseShared(knowledgeBaseId: string): Promise<boolean> {
    const share = await this.db.query.knowledgeBaseShares.findFirst({
      where: and(
        eq(knowledgeBaseShares.knowledgeBaseId, knowledgeBaseId),
        or(
          eq(knowledgeBaseShares.isGlobal, true),
          eq(knowledgeBaseShares.sharedWithUserId, this.userId),
        ),
      ),
    });
    return !!share;
  }

  /**
   * Get all knowledge base IDs that are accessible to the current user
   * Priority: global shares first, then user-specific shares
   */
  async getAccessibleKnowledgeBaseIds(): Promise<string[]> {
    // Step 1: Get global shares first
    const globalShares = await this.db
      .select({ knowledgeBaseId: knowledgeBaseShares.knowledgeBaseId })
      .from(knowledgeBaseShares)
      .where(eq(knowledgeBaseShares.isGlobal, true));

    const globalKbIds = new Set(globalShares.map((s) => s.knowledgeBaseId));

    // Step 2: Get user-specific shares
    const userShares = await this.db
      .select({ knowledgeBaseId: knowledgeBaseShares.knowledgeBaseId })
      .from(knowledgeBaseShares)
      .where(
        and(
          eq(knowledgeBaseShares.sharedWithUserId, this.userId),
          eq(knowledgeBaseShares.isGlobal, false),
        ),
      );

    // Step 3: Combine and deduplicate (global shares take priority)
    const allKbIds = new Set([...globalKbIds, ...userShares.map((s) => s.knowledgeBaseId)]);

    return Array.from(allKbIds);
  }

  // ******* Create Methods ******* //

  /**
   * Share a knowledge base with specific users (admin only)
   */
  async shareKnowledgeBase(
    knowledgeBaseId: string,
    targetUserIds: string[],
  ): Promise<KnowledgeBaseShareItem[]> {
    const shares: NewKnowledgeBaseShare[] = targetUserIds.map((targetUserId) => ({
      isGlobal: false,
      knowledgeBaseId,
      sharedByUserId: this.userId,
      sharedWithUserId: targetUserId,
    }));

    return this.db.insert(knowledgeBaseShares).values(shares).returning();
  }

  /**
   * Share a knowledge base globally with all users (admin only)
   */
  async shareGlobalKnowledgeBase(knowledgeBaseId: string): Promise<KnowledgeBaseShareItem> {
    const [share] = await this.db
      .insert(knowledgeBaseShares)
      .values({
        isGlobal: true,
        knowledgeBaseId,
        sharedByUserId: this.userId,
        sharedWithUserId: null,
      })
      .returning();

    return share;
  }

  // ******* Delete Methods ******* //

  /**
   * Unshare a knowledge base from specific users
   * Note: KB files are still accessible via query permissions, no cleanup needed
   */
  async unshareKnowledgeBase(knowledgeBaseId: string, targetUserIds: string[]): Promise<void> {
    if (targetUserIds.length === 0) return;

    const { inArray } = await import('drizzle-orm');

    await this.db
      .delete(knowledgeBaseShares)
      .where(
        and(
          eq(knowledgeBaseShares.knowledgeBaseId, knowledgeBaseId),
          inArray(knowledgeBaseShares.sharedWithUserId, targetUserIds),
        ),
      );
  }

  /**
   * Unshare a knowledge base globally
   * Note: KB files are still accessible via query permissions, no cleanup needed
   */
  async unshareGlobalKnowledgeBase(knowledgeBaseId: string): Promise<void> {
    await this.db
      .delete(knowledgeBaseShares)
      .where(
        and(
          eq(knowledgeBaseShares.knowledgeBaseId, knowledgeBaseId),
          eq(knowledgeBaseShares.isGlobal, true),
        ),
      );
  }

  /**
   * Get list of users a knowledge base is shared with
   */
  async getKnowledgeBaseShareList(knowledgeBaseId: string) {
    const { users } = await import('../schemas');

    const shares = await this.db
      .select({
        accessedAt: knowledgeBaseShares.accessedAt,
        createdAt: knowledgeBaseShares.createdAt,
        id: knowledgeBaseShares.id,
        isGlobal: knowledgeBaseShares.isGlobal,
        knowledgeBaseId: knowledgeBaseShares.knowledgeBaseId,
        permissions: knowledgeBaseShares.permissions,
        sharedByUserId: knowledgeBaseShares.sharedByUserId,
        sharedWithUserId: knowledgeBaseShares.sharedWithUserId,
        updatedAt: knowledgeBaseShares.updatedAt,
        userEmail: users.email,
        userFullName: users.fullName,
      })
      .from(knowledgeBaseShares)
      .leftJoin(users, eq(knowledgeBaseShares.sharedWithUserId, users.id))
      .where(eq(knowledgeBaseShares.knowledgeBaseId, knowledgeBaseId));

    return shares;
  }
}
