import type { QueryFileListParams } from '@lobechat/types';
import { FilesTabs, SortType } from '@lobechat/types';
import { and, asc, count, desc, eq, ilike, inArray, like, notExists, or, sum } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';

import type { FileItem, NewFile, NewGlobalFile } from '../schemas';
import {
  chunks,
  documentChunks,
  embeddings,
  fileChunks,
  files,
  globalFiles,
  knowledgeBaseFiles,
} from '../schemas';
import type { LobeChatDatabase, Transaction } from '../type';

export class FileModel {
  private readonly userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Get file by ID without userId filter (public access)
   * Use this for scenarios like file proxy where file should be accessible by ID alone
   *
   * @param db - Database instance
   * @param id - File ID
   * @returns File record or undefined
   */
  static async getFileById(db: LobeChatDatabase, id: string): Promise<FileItem | undefined> {
    return db.query.files.findFirst({
      where: eq(files.id, id),
    });
  }

  create = async (
    params: Omit<NewFile, 'id' | 'userId'> & {
      id?: string;
      knowledgeBaseId?: string;
      parentId?: string;
    },
    insertToGlobalFiles?: boolean,
    trx?: Transaction,
  ): Promise<{ id: string }> => {
    const executeInTransaction = async (tx: Transaction): Promise<FileItem> => {
      if (insertToGlobalFiles) {
        await tx
          .insert(globalFiles)
          .values({
            creator: this.userId,
            fileType: params.fileType,
            hashId: params.fileHash!,
            metadata: params.metadata,
            size: params.size,
            url: params.url,
          })
          .onConflictDoNothing();
      }

      const result = (await tx
        .insert(files)
        .values({ ...params, userId: this.userId })
        .returning()) as FileItem[];

      const item = result[0]!;

      if (params.knowledgeBaseId) {
        await tx.insert(knowledgeBaseFiles).values({
          fileId: item.id,
          knowledgeBaseId: params.knowledgeBaseId,
          userId: this.userId,
        });
      }

      return item;
    };

    const result = await (trx
      ? executeInTransaction(trx)
      : this.db.transaction(executeInTransaction));
    return { id: result.id };
  };

  createGlobalFile = async (file: Omit<NewGlobalFile, 'id' | 'userId'>) => {
    return this.db.insert(globalFiles).values(file).returning();
  };

  checkHash = async (hash: string) => {
    const item = await this.db.query.globalFiles.findFirst({
      where: eq(globalFiles.hashId, hash),
    });
    if (!item) return { isExist: false };

    return {
      fileType: item.fileType,
      isExist: true,
      metadata: item.metadata,
      size: item.size,
      url: item.url,
    };
  };

  delete = async (id: string, removeGlobalFile: boolean = true, trx?: Transaction) => {
    const executeInTransaction = async (tx: Transaction) => {
      // In pglite environment, non-transactional operations cannot be used within a transaction as it will block
      const file = await this.findById(id, tx);
      // pglite 环境下不能再 transaction 中使用非事务操作，会阻塞住
      const file = await this.findById(id, tx, true); // Use skipUserCheck to allow shared KB access
      if (!file) return;

      // Check if user owns the file or has access via shared KB
      const isOwner = file.userId === this.userId;
      let hasSharedAccess = false;

      if (!isOwner) {
        // Check if file belongs to a shared KB
        const kbFile = await tx.query.knowledgeBaseFiles.findFirst({
          where: eq(knowledgeBaseFiles.fileId, id),
        });

        if (kbFile) {
          const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
          const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
          const accessibleKBIds = await sharingModel.getAccessibleKnowledgeBaseIds();

          hasSharedAccess = accessibleKBIds.includes(kbFile.knowledgeBaseId);
        }
      }

      if (!isOwner && !hasSharedAccess) {
        return; // User doesn't have permission to delete this file
      }

      const fileHash = file.fileHash!;

      // 2. Delete related chunks
      await this.deleteFileChunks(tx as any, [id]);

      // 3. Delete file record (allow deletion if owner or has shared access)
      await tx.delete(files).where(eq(files.id, id));

      const result = await tx
        .select({ count: count() })
        .from(files)
        .where(and(eq(files.fileHash, fileHash)));

      const fileCount = result[0].count;

      // delete the file from global file if it is not used by other files
      // if `DISABLE_REMOVE_GLOBAL_FILE` is true, we will not remove the global file
      if (fileCount === 0 && removeGlobalFile) {
        await tx.delete(globalFiles).where(eq(globalFiles.hashId, fileHash));

        return file;
      }
    };

    return await (trx ? executeInTransaction(trx) : this.db.transaction(executeInTransaction));
  };

  deleteGlobalFile = async (hashId: string) => {
    return this.db.delete(globalFiles).where(eq(globalFiles.hashId, hashId));
  };

  countUsage = async () => {
    const result = await this.db
      .select({
        totalSize: sum(files.size),
      })
      .from(files)
      .where(eq(files.userId, this.userId));

    return parseInt(result[0].totalSize!) || 0;
  };

  deleteMany = async (ids: string[], removeGlobalFile: boolean = true) => {
    if (ids.length === 0) return [];

    return await this.db.transaction(async (trx) => {
      // 1. First get the file list to return the deleted files
      const fileList = await trx.query.files.findMany({
        where: and(inArray(files.id, ids), eq(files.userId, this.userId)),
      // 1. Get files that user owns or has access to via shared KBs
      const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
      const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
      const accessibleKBIds = await sharingModel.getAccessibleKnowledgeBaseIds();

      // Get all files with the given IDs
      const allFiles = await trx.query.files.findMany({
        where: inArray(files.id, ids),
      });

      // Wait for all async checks to complete
      const fileResults = await Promise.all(
        allFiles.map(async (file) => {
          const isOwner = file.userId === this.userId;
          if (isOwner) return file;

          const kbFile = await trx.query.knowledgeBaseFiles.findFirst({
            where: eq(knowledgeBaseFiles.fileId, file.id),
          });

          if (kbFile && accessibleKBIds.includes(kbFile.knowledgeBaseId)) {
            return file;
          }

          return null;
        }),
      );
      const deletableFiles = fileResults.filter(
        (file): file is NonNullable<typeof file> => file !== null,
      );

      if (deletableFiles.length === 0) return [];

      // Extract file IDs that can be deleted
      const deletableFileIds = deletableFiles.map((file) => file.id);

      // Extract file hashes that need to be checked
      const hashList = fileList.map((file) => file.fileHash!).filter(Boolean);

      // 2. Delete related chunks
      await this.deleteFileChunks(trx as any, ids);

      // 3. Delete file records
      await trx.delete(files).where(and(inArray(files.id, ids), eq(files.userId, this.userId)));

      // If global files don't need to be deleted, return directly
      if (!removeGlobalFile || hashList.length === 0) return fileList;
      // 提取需要检查的文件哈希值
      const hashList = deletableFiles.map((file) => file.fileHash!).filter(Boolean);

      // 2. 删除相关的 chunks
      await this.deleteFileChunks(trx as any, deletableFileIds);

      // 3. 删除文件记录 (allow deletion if owner or has shared access)
      await trx.delete(files).where(inArray(files.id, deletableFileIds));

      // 如果不需要删除全局文件，直接返回
      if (!removeGlobalFile || hashList.length === 0) return deletableFiles;

      // 4. Find hashes that are no longer referenced
      const remainingFiles = await trx
        .select({
          fileHash: files.fileHash,
        })
        .from(files)
        .where(inArray(files.fileHash, hashList));

      // Put still-in-use hashes into a Set for quick lookup
      const usedHashes = new Set(remainingFiles.map((file) => file.fileHash));

      // Find hashes to delete (those no longer used by any file)
      const hashesToDelete = hashList.filter((hash) => !usedHashes.has(hash));

      if (hashesToDelete.length === 0) return deletableFiles;

      // 5. Delete global files that are no longer referenced
      await trx.delete(globalFiles).where(inArray(globalFiles.hashId, hashesToDelete));

      // Return the list of deleted files
      return fileList;
      // 返回删除的文件列表
      return deletableFiles;
    });
  };

  clear = async () => {
    return this.db.delete(files).where(eq(files.userId, this.userId));
  };

  query = async ({
    category,
    q,
    sortType,
    sorter,
    knowledgeBaseId,
    showFilesInKnowledgeBase,
  }: QueryFileListParams = {}) => {
    // 1. Build where clause
    // 1. Check if querying a shared KB - if so, skip userId filter
    let isSharedKB = false;
    if (knowledgeBaseId) {
      const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
      const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
      const accessibleKBIds = await sharingModel.getAccessibleKnowledgeBaseIds();

      // Check if this KB is shared with user (not owned by user)
      isSharedKB = accessibleKBIds.includes(knowledgeBaseId);
    }

    // 2. query where
    let whereClause = and(
      q ? ilike(files.name, `%${q}%`) : undefined,
      // Skip userId filter for shared KB files
      isSharedKB ? undefined : eq(files.userId, this.userId),
    );
    if (category && category !== FilesTabs.All && category !== FilesTabs.Home) {
      const fileTypePrefix = this.getFileTypePrefix(category as FilesTabs);
      if (Array.isArray(fileTypePrefix)) {
        // For multiple file types (e.g., Documents includes 'application' and 'custom')
        whereClause = and(
          whereClause,
          or(...fileTypePrefix.map((prefix) => ilike(files.fileType, `${prefix}%`))),
        );
      } else {
        whereClause = and(whereClause, ilike(files.fileType, `${fileTypePrefix}%`));
      }
    }

    // 2. Build order clause
    // 3. order part

    let orderByClause = desc(files.createdAt);
    // create a map for sortable fields
    const sortableFields = {
      createdAt: files.createdAt,
      name: files.name,
      size: files.size,
      updatedAt: files.updatedAt,
    } as const;
    type SortableField = keyof typeof sortableFields;

    if (sorter && sortType && sorter in sortableFields) {
      const sortFunction = sortType.toLowerCase() === SortType.Asc ? asc : desc;
      orderByClause = sortFunction(sortableFields[sorter as SortableField]);
    }

    // 3. Build base query
    // 4. build query
    let query = this.db
      .select({
        chunkTaskId: files.chunkTaskId,
        createdAt: files.createdAt,
        embeddingTaskId: files.embeddingTaskId,
        fileType: files.fileType,
        id: files.id,
        name: files.name,
        size: files.size,
        updatedAt: files.updatedAt,
        url: files.url,
      })
      .from(files);

    // 4. Add knowledge base query if needed
    // 5. add knowledge base query
    if (knowledgeBaseId) {
      // if knowledgeBaseId is provided, it means we are querying files in a knowledge-base

      // @ts-ignore
      query = query.innerJoin(
        knowledgeBaseFiles,
        and(
          eq(files.id, knowledgeBaseFiles.fileId),
          eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId),
        ),
      );
    }
    // 5. If we don't show files in knowledge base, exclude them
    // 6.if we don't show files in knowledge base, we need exclude files in knowledge base
    else if (!showFilesInKnowledgeBase) {
      whereClause = and(
        whereClause,
        notExists(
          this.db.select().from(knowledgeBaseFiles).where(eq(knowledgeBaseFiles.fileId, files.id)),
        ),
      );
    }

    // Otherwise, we are just filtering in the global files
    return query.where(whereClause).orderBy(orderByClause);
  };

  findByIds = async (ids: string[]) => {
    return this.db.query.files.findMany({
      where: and(inArray(files.id, ids), eq(files.userId, this.userId)),
    });
  };

  findById = async (id: string, trx?: Transaction, skipUserCheck: boolean = false) => {
    const database = trx || this.db;

    // If skipUserCheck, allow access to files in shared KBs
    if (skipUserCheck) {
      const file = await database.query.files.findFirst({
        where: eq(files.id, id),
      });

      if (!file) return null;

      // Check if file belongs to a KB that is shared with this user
      const kbFile = await database.query.knowledgeBaseFiles.findFirst({
        where: eq(knowledgeBaseFiles.fileId, id),
      });

      if (kbFile) {
        const { KnowledgeBaseSharingModel } = await import('./knowledgeBaseSharing');
        const sharingModel = new KnowledgeBaseSharingModel(this.db, this.userId);
        const accessibleKBIds = await sharingModel.getAccessibleKnowledgeBaseIds();

        // Allow if KB is accessible (owned or shared)
        if (accessibleKBIds.includes(kbFile.knowledgeBaseId)) {
          return file;
        }
      }

      // Check if file is owned by user
      if (file.userId === this.userId) {
        return file;
      }

      return null;
    }

    return database.query.files.findFirst({
      where: and(eq(files.id, id), eq(files.userId, this.userId)),
    });
  };

  countFilesByHash = async (hash: string) => {
    const result = await this.db
      .select({
        count: count(),
      })
      .from(files)
      .where(and(eq(files.fileHash, hash)));

    return result[0].count;
  };

  update = async (id: string, value: Partial<FileItem>) =>
    this.db
      .update(files)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, this.userId)));

  /**
   * get the corresponding file type prefix according to FilesTabs
   */
  private getFileTypePrefix = (category: FilesTabs): string | string[] => {
    switch (category) {
      case FilesTabs.Audios: {
        return 'audio';
      }
      case FilesTabs.Documents: {
        return ['application', 'custom'];
      }
      case FilesTabs.Images: {
        return 'image';
      }
      case FilesTabs.Videos: {
        return 'video';
      }
      case FilesTabs.Websites: {
        return 'text/html';
      }
      default: {
        return '';
      }
    }
  };

  findByNames = async (fileNames: string[]) =>
    this.db.query.files.findMany({
      where: and(
        or(...fileNames.map((name) => like(files.name, `${name}%`))),
        eq(files.userId, this.userId),
      ),
    });

  // Abstract common method for deleting chunks
  private deleteFileChunks = async (trx: PgTransaction<any>, fileIds: string[]) => {
    if (fileIds.length === 0) return;

    // Get all chunk IDs related to the files to be deleted (knowledge base protection logic removed)
    const relatedChunks = await trx
      .select({ chunkId: fileChunks.chunkId })
      .from(fileChunks)
      .where(inArray(fileChunks.fileId, fileIds));

    const chunkIds = relatedChunks.map((c) => c.chunkId).filter(Boolean) as string[];

    if (chunkIds.length === 0) return;

    // Batch processing configuration
    const BATCH_SIZE = 1000;
    const MAX_CONCURRENT_BATCHES = 3;

    // Process in batches concurrently
    for (let i = 0; i < chunkIds.length; i += BATCH_SIZE * MAX_CONCURRENT_BATCHES) {
      const batchPromises = [];

      // Create multiple parallel batches
      for (let j = 0; j < MAX_CONCURRENT_BATCHES; j++) {
        const startIdx = i + j * BATCH_SIZE;
        if (startIdx >= chunkIds.length) break;

        const batchChunkIds = chunkIds.slice(startIdx, startIdx + BATCH_SIZE);
        if (batchChunkIds.length === 0) continue;

        // Process each batch in the correct deletion order, failures do not block the flow
        const batchPromise = (async () => {
          // 1. Delete embeddings (top-level, has foreign key dependencies)
          try {
            await trx.delete(embeddings).where(inArray(embeddings.chunkId, batchChunkIds));
          } catch (e) {
            // Silent handling, does not block deletion process
            console.warn('Failed to delete embeddings:', e);
          }

          // 2. Delete documentChunks association (if exists)
          try {
            await trx.delete(documentChunks).where(inArray(documentChunks.chunkId, batchChunkIds));
          } catch (e) {
            // Silent handling, does not block deletion process
            console.warn('Failed to delete documentChunks:', e);
          }

          // 3. Delete chunks (core data)
          try {
            await trx.delete(chunks).where(inArray(chunks.id, batchChunkIds));
          } catch (e) {
            // Silent handling, does not block deletion process
            console.warn('Failed to delete chunks:', e);
          }
        })();

        batchPromises.push(batchPromise);
      }

      // Wait for all tasks in the current batch to complete
      await Promise.all(batchPromises);
    }

    // 4. Finally delete fileChunks association table records
    try {
      await trx.delete(fileChunks).where(inArray(fileChunks.fileId, fileIds));
    } catch (e) {
      // Silent handling, does not block deletion process
      console.warn('Failed to delete fileChunks:', e);
    }

    return chunkIds;
  };
}
