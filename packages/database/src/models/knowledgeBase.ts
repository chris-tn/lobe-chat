import { KnowledgeBaseItem } from '@lobechat/types';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { NewKnowledgeBase, knowledgeBaseFiles, knowledgeBases } from '../schemas';
import { LobeChatDatabase } from '../type';

export class KnowledgeBaseModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // create

  create = async (params: Omit<NewKnowledgeBase, 'userId'>) => {
    const [result] = await this.db
      .insert(knowledgeBases)
      .values({ ...params, userId: this.userId })
      .returning();

    return result;
  };

  addFilesToKnowledgeBase = async (id: string, fileIds: string[]) => {
    return this.db
      .insert(knowledgeBaseFiles)
      .values(fileIds.map((fileId) => ({ fileId, knowledgeBaseId: id, userId: this.userId })))
      .returning();
  };

  // delete
  delete = async (id: string) => {
    return this.db
      .delete(knowledgeBases)
      .where(and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)));
  };

  deleteAll = async () => {
    return this.db.delete(knowledgeBases).where(eq(knowledgeBases.userId, this.userId));
  };

  removeFilesFromKnowledgeBase = async (knowledgeBaseId: string, ids: string[]) => {
    return this.db.delete(knowledgeBaseFiles).where(
      and(
        eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId),
        inArray(knowledgeBaseFiles.fileId, ids),
        // eq(knowledgeBaseFiles.userId, this.userId),
      ),
    );
  };
  // query
  query = async () => {
    // Get accessible knowledge base IDs (owned + shared)
    const {KnowledgeBaseSharingModel} = await import('./knowledgeBaseSharing');
    const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
    const sharedKbIds = await sharingModel.getAccessibleKnowledgeBaseIds();

    // Query owned KBs
    const ownedData = await this.db
      .select({
        avatar: knowledgeBases.avatar,
        createdAt: knowledgeBases.createdAt,
        description: knowledgeBases.description,
        id: knowledgeBases.id,
        isPublic: knowledgeBases.isPublic,
        name: knowledgeBases.name,
        settings: knowledgeBases.settings,
        type: knowledgeBases.type,
        updatedAt: knowledgeBases.updatedAt,
      })
      .from(knowledgeBases)
      .where(eq(knowledgeBases.userId, this.userId))
      .orderBy(desc(knowledgeBases.updatedAt));

    // Query shared KBs (if any)
    let sharedData: KnowledgeBaseItem[] = [];
    if (sharedKbIds.length > 0) {
      const { inArray } = await import('drizzle-orm');
      sharedData = (await this.db
        .select({
          avatar: knowledgeBases.avatar,
          createdAt: knowledgeBases.createdAt,
          description: knowledgeBases.description,
          id: knowledgeBases.id,
          isPublic: knowledgeBases.isPublic,
          name: knowledgeBases.name,
          settings: knowledgeBases.settings,
          type: knowledgeBases.type,
          updatedAt: knowledgeBases.updatedAt,
        })
        .from(knowledgeBases)
        .where(inArray(knowledgeBases.id, sharedKbIds))
        .orderBy(desc(knowledgeBases.updatedAt))) as KnowledgeBaseItem[];
    }

    // Merge and deduplicate (owned + shared)
    const allKbs = [...ownedData, ...sharedData];
    const uniqueKbs = Array.from(
      new Map(allKbs.map((kb) => [kb.id, kb])).values(),
    ) as KnowledgeBaseItem[];

    return uniqueKbs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

  findById = async (id: string) => {
    // First, try to find KB owned by user
    const ownedKB = await this.db.query.knowledgeBases.findFirst({
      where: and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)),
    });

    if (ownedKB) return ownedKB;

    // If not owned, check if KB is shared with this user
    const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
    const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
    const accessibleKBIds = await sharingModel.getAccessibleKnowledgeBaseIds();

    if (accessibleKBIds.includes(id)) {
      // User has access to this KB via sharing, return it without userId filter
      return this.db.query.knowledgeBases.findFirst({
        where: eq(knowledgeBases.id, id),
      });
    }

    return undefined;
  };

  // update
  update = async (id: string, value: Partial<KnowledgeBaseItem>) =>
    this.db
      .update(knowledgeBases)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)));

  static findById = async (db: LobeChatDatabase, id: string) =>
    db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.id, id),
    });
}
