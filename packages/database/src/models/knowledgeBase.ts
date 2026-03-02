import type { KnowledgeBaseItem } from '@lobechat/types';
import { and, desc, eq, inArray } from 'drizzle-orm';

import type { NewKnowledgeBase } from '../schemas';
import { documents, knowledgeBaseFiles, knowledgeBases } from '../schemas';
import type { LobeChatDatabase } from '../type';

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
    // Separate document IDs from file IDs
    const documentIds = fileIds.filter((id) => id.startsWith('docs_'));
    const directFileIds = fileIds.filter((id) => !id.startsWith('docs_'));

    // Resolve document IDs to their mirror file IDs via documents.fileId
    let resolvedFileIds = [...directFileIds];
    if (documentIds.length > 0) {
      const docsWithFiles = await this.db
        .select({ fileId: documents.fileId })
        .from(documents)
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));

      const mirrorFileIds = docsWithFiles
        .map((doc) => doc.fileId)
        .filter((id): id is string => id !== null);
      resolvedFileIds = [...resolvedFileIds, ...mirrorFileIds];

      // Update documents.knowledgeBaseId for pages
      await this.db
        .update(documents)
        .set({ knowledgeBaseId: id })
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));
    }

    // Insert using resolved file IDs
    if (resolvedFileIds.length === 0) {
      return [];
    }

    return this.db
      .insert(knowledgeBaseFiles)
      .values(
        resolvedFileIds.map((fileId) => ({ fileId, knowledgeBaseId: id, userId: this.userId })),
      )
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
    // Separate document IDs from file IDs
    const documentIds = ids.filter((id) => id.startsWith('docs_'));
    const directFileIds = ids.filter((id) => !id.startsWith('docs_'));

    // Resolve document IDs to their mirror file IDs via documents.fileId
    let resolvedFileIds = [...directFileIds];
    if (documentIds.length > 0) {
      const docsWithFiles = await this.db
        .select({ fileId: documents.fileId })
        .from(documents)
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));

      const mirrorFileIds = docsWithFiles
        .map((doc) => doc.fileId)
        .filter((id): id is string => id !== null);
      resolvedFileIds = [...resolvedFileIds, ...mirrorFileIds];

      // Clear documents.knowledgeBaseId for pages
      await this.db
        .update(documents)
        .set({ knowledgeBaseId: null })
        .where(
          and(
            inArray(documents.id, documentIds),
            eq(documents.userId, this.userId),
            eq(documents.knowledgeBaseId, knowledgeBaseId),
          ),
        );
    }

    // Delete using resolved file IDs
    if (resolvedFileIds.length === 0) {
      return;
    }

    return this.db
      .delete(knowledgeBaseFiles)
      .where(
        and(
          eq(knowledgeBaseFiles.userId, this.userId),
          eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId),
          inArray(knowledgeBaseFiles.fileId, resolvedFileIds),
        ),
      );
  };
  // query
  query = async () => {
    // Get accessible knowledge base IDs (owned + shared)
    const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
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
