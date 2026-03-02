import { and, desc, eq, inArray } from 'drizzle-orm';

import {
  IntegrationFileMappingItem,
  IntegrationItem,
  IntegrationSyncItem,
  NewIntegration,
  NewIntegrationFileMapping,
  NewIntegrationSync,
  integrationFileMappings,
  integrationSyncs,
  integrations,
} from '../schemas';
import { LobeChatDatabase } from '../type';

export class IntegrationModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // create
  create = async (params: Omit<NewIntegration, 'userId'>) => {
    const [result] = await this.db
      .insert(integrations)
      .values({ ...params, userId: this.userId })
      .returning();

    return result;
  };

  // query
  query = async () => {
    return this.db
      .select()
      .from(integrations)
      .where(eq(integrations.userId, this.userId))
      .orderBy(desc(integrations.updatedAt));
  };

  findById = async (id: string) => {
    return this.db.query.integrations.findFirst({
      where: and(eq(integrations.id, id), eq(integrations.userId, this.userId)),
    });
  };

  findByKnowledgeBaseId = async (knowledgeBaseId: string) => {
    return this.db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.knowledgeBaseId, knowledgeBaseId),
          eq(integrations.userId, this.userId),
        ),
      )
      .orderBy(desc(integrations.updatedAt));
  };

  // update
  update = async (id: string, value: Partial<IntegrationItem>) => {
    return this.db
      .update(integrations)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(integrations.id, id), eq(integrations.userId, this.userId)));
  };

  // delete
  delete = async (id: string) => {
    return this.db
      .delete(integrations)
      .where(and(eq(integrations.id, id), eq(integrations.userId, this.userId)));
  };

  // Sync operations
  createSync = async (params: Omit<NewIntegrationSync, 'id'>) => {
    const [result] = await this.db.insert(integrationSyncs).values(params).returning();
    return result;
  };

  updateSync = async (id: string, value: Partial<IntegrationSyncItem>) => {
    return this.db
      .update(integrationSyncs)
      .set({ ...value, updatedAt: new Date() })
      .where(eq(integrationSyncs.id, id));
  };

  getSyncs = async (integrationId: string, limit = 10) => {
    return this.db
      .select()
      .from(integrationSyncs)
      .where(eq(integrationSyncs.integrationId, integrationId))
      .orderBy(desc(integrationSyncs.startedAt))
      .limit(limit);
  };

  getLatestSync = async (integrationId: string) => {
    return this.db.query.integrationSyncs.findFirst({
      orderBy: desc(integrationSyncs.startedAt),
      where: eq(integrationSyncs.integrationId, integrationId),
    });
  };

  // File mapping operations
  createFileMapping = async (params: NewIntegrationFileMapping) => {
    const [result] = await this.db.insert(integrationFileMappings).values(params).returning();
    return result;
  };

  updateFileMapping = async (
    integrationId: string,
    fileId: string,
    value: Partial<IntegrationFileMappingItem>,
  ) => {
    return this.db
      .update(integrationFileMappings)
      .set({ ...value, updatedAt: new Date() })
      .where(
        and(
          eq(integrationFileMappings.integrationId, integrationId),
          eq(integrationFileMappings.fileId, fileId),
        ),
      );
  };

  getFileMapping = async (integrationId: string, fileId: string) => {
    return this.db.query.integrationFileMappings.findFirst({
      where: and(
        eq(integrationFileMappings.integrationId, integrationId),
        eq(integrationFileMappings.fileId, fileId),
      ),
    });
  };

  getFileMappingByRemotePath = async (integrationId: string, remotePath: string) => {
    return this.db.query.integrationFileMappings.findFirst({
      where: and(
        eq(integrationFileMappings.integrationId, integrationId),
        eq(integrationFileMappings.remotePath, remotePath),
      ),
    });
  };

  getAllFileMappings = async (integrationId: string) => {
    return this.db
      .select()
      .from(integrationFileMappings)
      .where(eq(integrationFileMappings.integrationId, integrationId));
  };

  deleteFileMapping = async (integrationId: string, fileId: string) => {
    return this.db
      .delete(integrationFileMappings)
      .where(
        and(
          eq(integrationFileMappings.integrationId, integrationId),
          eq(integrationFileMappings.fileId, fileId),
        ),
      );
  };

  deleteFileMappings = async (integrationId: string, fileIds: string[]) => {
    return this.db
      .delete(integrationFileMappings)
      .where(
        and(
          eq(integrationFileMappings.integrationId, integrationId),
          inArray(integrationFileMappings.fileId, fileIds),
        ),
      );
  };

  // Get all active integrations that need syncing
  getActiveIntegrationsForSync = async () => {
    return this.db
      .select()
      .from(integrations)
      .where(and(eq(integrations.syncEnabled, true), eq(integrations.status, 'active')));
  };
}
