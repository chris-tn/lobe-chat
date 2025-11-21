import { LobeChatDatabase } from '@lobechat/database';
import { loadFile } from '@lobechat/file-loaders';
import { uuid } from '@lobechat/utils';
import debug from 'debug';
import { fileTypeFromBuffer } from 'file-type';
import { sha256 } from 'js-sha256';

import { DocumentModel } from '@/database/models/document';
import { FileModel } from '@/database/models/file';
import { IntegrationModel } from '@/database/models/integration';
import { KnowledgeBaseModel } from '@/database/models/knowledgeBase';
import { fileEnv } from '@/envs/file';
import { TempFileManager } from '@/server/utils/tempFileManager';
import { nanoid } from '@/utils/uuid';

import { DocumentService } from '../document';
import { FileService } from '../file';
import { NextcloudService } from './nextcloud';

const log = debug('lobe-chat:service:integration:sync');

interface SyncResult {
  errors: Array<{ error: string, file: string; }>;
  filesAdded: number;
  filesDeleted: number;
  filesSkipped: number;
  filesUpdated: number;
}

export class IntegrationSyncService {
  private db: LobeChatDatabase;
  private userId: string;
  private integrationModel: IntegrationModel;
  private fileModel: FileModel;
  private fileService: FileService;
  private documentService: DocumentService;
  private knowledgeBaseModel: KnowledgeBaseModel;

  constructor(db: LobeChatDatabase, userId: string) {
    this.db = db;
    this.userId = userId;
    this.integrationModel = new IntegrationModel(db, userId);
    this.fileModel = new FileModel(db, userId);
    this.fileService = new FileService(db, userId);
    this.documentService = new DocumentService(db, userId);
    this.knowledgeBaseModel = new KnowledgeBaseModel(db, userId);
  }

  /**
   * Generate file path for S3 storage
   */
  private generateFilePath(filename: string): string {
    const extension = filename.split('.').at(-1) || 'bin';
    const uniqueFilename = `${uuid()}.${extension}`;
    const date = (Date.now() / 1000 / 60 / 60).toFixed(0);
    const dirname = `${fileEnv.NEXT_PUBLIC_S3_FILE_PATH}/${date}`;
    return `${dirname}/${uniqueFilename}`;
  }

  /**
   * Upload buffer to S3 and return metadata
   */
  private async uploadBufferToS3(
    buffer: Buffer,
    filename: string,
  ): Promise<{ filename: string; path: string; size: number }> {
    const path = this.generateFilePath(filename);

    // Detect MIME type from buffer (supports all file types, not just images)
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    let contentType = fileTypeResult?.mime;

    // Fallback to extension-based detection if buffer detection fails
    if (!contentType) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext) {
        const mime = await import('mime');
        contentType = mime.default.getType(ext) || 'application/octet-stream';
      } else {
        contentType = 'application/octet-stream';
      }
    }

    // Use S3's uploadBuffer method which accepts contentType
    // Access the S3 instance directly (fileService uses S3StaticFileImpl which wraps S3)
    const { S3 } = await import('@/server/modules/S3');
    const s3 = new S3();
    await s3.uploadBuffer(path, buffer, contentType);

    return {
      filename,
      path,
      size: buffer.length,
    };
  }

  /**
   * Process a file: upload, create record, parse, and associate with KB
   */
  private async processFile(
    buffer: Buffer,
    filename: string,
    remotePath: string,
    remoteSize: number,
    remoteModifiedAt: string,
    remoteETag: string | undefined,
    knowledgeBaseId: string,
    integrationId: string,
  ): Promise<{ fileId: string; isNew: boolean }> {
    // 1. Calculate hash
    const hash = sha256(buffer);

    // 2. Check if file already exists
    const existingFileCheck = await this.fileModel.checkHash(hash);
    let fileId: string;
    let isNew = false;

    if (existingFileCheck.isExist) {
      // File exists, check if it's already mapped to this integration
      const existingMapping = await this.integrationModel.getFileMappingByRemotePath(
        integrationId,
        remotePath,
      );

      if (existingMapping) {
        // Update mapping metadata
        await this.integrationModel.updateFileMapping(integrationId, existingMapping.fileId, {
          lastSyncedAt: new Date(),
          remoteETag,
          remoteModifiedAt: new Date(remoteModifiedAt),
          remoteSize,
        });
        return { fileId: existingMapping.fileId, isNew: false };
      }

      // File exists but not mapped, need to create mapping and associate with KB
      // Find the file by hash
      const existingFiles = await this.db.query.files.findMany({
        limit: 1,
        where: (files, { eq }) => eq(files.fileHash, hash),
      });

      if (existingFiles.length > 0) {
        fileId = existingFiles[0].id;
      } else {
        // File in global but not in user's files, create new record
        const metadata = existingFileCheck.metadata as
          | { fileType?: string; path?: string }
          | undefined;
        const { id } = await this.fileModel.create(
          {
            fileHash: hash,
            fileType:
              metadata?.fileType || existingFileCheck.fileType || 'application/octet-stream',
            metadata,
            name: filename,
            size: buffer.length,
            url: metadata?.path || existingFileCheck.url || '',
          },
          false, // Don't create global file, it already exists
        );
        fileId = id;
      }
    } else {
      // New file, upload to S3
      isNew = true;
      const fileTypeResult = await fileTypeFromBuffer(buffer);
      const fileType = fileTypeResult?.mime || 'application/octet-stream';
      const metadata = await this.uploadBufferToS3(buffer, filename);

      const { id } = await this.fileModel.create(
        {
          fileHash: hash,
          fileType,
          metadata,
          name: filename,
          size: buffer.length,
          url: metadata.path,
        },
        true, // Create global file
      );
      fileId = id;
    }

    // 3. Create or update file mapping
    const existingMapping = await this.integrationModel.getFileMapping(integrationId, fileId);
    if (existingMapping) {
      await this.integrationModel.updateFileMapping(integrationId, fileId, {
        lastSyncedAt: new Date(),
        remoteETag,
        remoteModifiedAt: new Date(remoteModifiedAt),
        remoteSize,
      });
    } else {
      await this.integrationModel.createFileMapping({
        fileId,
        integrationId,
        lastSyncedAt: new Date(),
        remoteETag,
        remoteModifiedAt: new Date(remoteModifiedAt),
        remotePath,
        remoteSize,
        syncedAt: new Date(),
      });
    }

    // 4. Associate file with knowledge base
    await this.knowledgeBaseModel.addFilesToKnowledgeBase(knowledgeBaseId, [fileId]);

    // 5. Parse file content if it's new or changed
    if (isNew) {
      try {
        // Download file to local for parsing
        const dir = nanoid();
        const tempManager = new TempFileManager(dir);
        const filePath = await tempManager.writeTempFile(buffer, filename);

        try {
          const fileDocument = await loadFile(filePath);
          const documentModel = new DocumentModel(this.db, this.userId);
          const fileTypeResult = await fileTypeFromBuffer(buffer);
          const documentFileType = fileTypeResult?.mime || 'application/octet-stream';

          await documentModel.create({
            content: fileDocument.content,
            fileId,
            fileType: documentFileType,
            metadata: fileDocument.metadata,
            pages: fileDocument.pages,
            source: remotePath,
            sourceType: 'file',
            title: fileDocument.metadata?.title || filename,
            totalCharCount: fileDocument.totalCharCount,
            totalLineCount: fileDocument.totalLineCount,
          });
        } finally {
          tempManager.cleanup();
        }
      } catch (error) {
        log('Error parsing file %s: %O', filename, error);
        // Don't throw, continue with other files
      }
    }

    return { fileId, isNew };
  }

  /**
   * Sync integration: download files from Nextcloud and process them
   */
  async syncIntegration(integrationId: string): Promise<SyncResult> {
    const integration = await this.integrationModel.findById(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (integration.type !== 'nextcloud') {
      throw new Error(`Unsupported integration type: ${integration.type}`);
    }

    const config = integration.config as any;
    const nextcloudService = new NextcloudService(config);

    // Create sync record
    const startedAt = new Date();
    const syncRecord = await this.integrationModel.createSync({
      filesAdded: 0,
      filesDeleted: 0,
      filesSkipped: 0,
      filesUpdated: 0,
      integrationId,
      logs: [],
      startedAt,
      status: 'running',
    });
    const syncId = syncRecord.id;

    const result: SyncResult = {
      errors: [],
      filesAdded: 0,
      filesDeleted: 0,
      filesSkipped: 0,
      filesUpdated: 0,
    };

    const logs: Array<{ level: string; message: string, timestamp: string; }> = [];

    const addLog = (level: string, message: string) => {
      logs.push({
        level,
        message,
        timestamp: new Date().toISOString(),
      });
      log('[%s] %s: %s', level, integrationId, message);
    };

    try {
      addLog('info', `Starting sync for integration: ${integration.name}`);

      // 1. List files from Nextcloud
      addLog('info', 'Listing files from Nextcloud...');
      const remoteFiles = await nextcloudService.listFiles();
      addLog('info', `Found ${remoteFiles.length} files in Nextcloud`);

      // 2. Get existing file mappings
      const existingMappings = await this.integrationModel.getAllFileMappings(integrationId);
      const mappingByRemotePath = new Map(existingMappings.map((m) => [m.remotePath, m]));

      // 3. Process each remote file
      for (const remoteFile of remoteFiles) {
        try {
          const existingMapping = mappingByRemotePath.get(remoteFile.filename);

          // Check if file needs update
          let needsUpdate = false;
          if (existingMapping && // Compare metadata
            (
              existingMapping.remoteSize !== remoteFile.size ||
              existingMapping.remoteETag !== remoteFile.etag ||
              (existingMapping.remoteModifiedAt &&
                new Date(existingMapping.remoteModifiedAt).getTime() <
                  new Date(remoteFile.lastmod).getTime())
            )) {
              needsUpdate = true;
            }

          if (existingMapping && !needsUpdate) {
            result.filesSkipped++;
            addLog('debug', `Skipping unchanged file: ${remoteFile.filename}`);
            continue;
          }

          // Download file
          addLog('info', `Downloading file: ${remoteFile.filename}`);
          const buffer = await nextcloudService.downloadFile(remoteFile.filename);

          // Process file
          const { isNew } = await this.processFile(
            buffer,
            remoteFile.basename,
            remoteFile.filename,
            remoteFile.size,
            remoteFile.lastmod,
            remoteFile.etag,
            integration.knowledgeBaseId,
            integrationId,
          );

          if (isNew) {
            result.filesAdded++;
            addLog('info', `Added new file: ${remoteFile.filename}`);
          } else {
            result.filesUpdated++;
            addLog('info', `Updated file: ${remoteFile.filename}`);
          }
        } catch (error) {
          result.errors.push({
            error: error instanceof Error ? error.message : String(error),
            file: remoteFile.filename,
          });
          addLog('error', `Error processing file ${remoteFile.filename}: ${error}`);
        }
      }

      // 4. Check for deleted files (files in mapping but not in remote)
      const remoteFilePaths = new Set(remoteFiles.map((f) => f.filename));
      for (const mapping of existingMappings) {
        if (!remoteFilePaths.has(mapping.remotePath)) {
          // File was deleted in Nextcloud, remove from KB
          try {
            await this.knowledgeBaseModel.removeFilesFromKnowledgeBase(
              integration.knowledgeBaseId,
              [mapping.fileId],
            );
            await this.integrationModel.deleteFileMapping(integrationId, mapping.fileId);
            result.filesDeleted++;
            addLog('info', `Deleted file: ${mapping.remotePath}`);
          } catch (error) {
            result.errors.push({
              error: error instanceof Error ? error.message : String(error),
              file: mapping.remotePath,
            });
            addLog('error', `Error deleting file ${mapping.remotePath}: ${error}`);
          }
        }
      }

      // Update sync record
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await this.integrationModel.updateSync(syncId, {
        completedAt,
        duration,
        filesAdded: result.filesAdded,
        filesDeleted: result.filesDeleted,
        filesSkipped: result.filesSkipped,
        filesUpdated: result.filesUpdated,
        logs,
        status: 'completed',
      });

      // Update integration
      await this.integrationModel.update(integrationId, {
        errorMessage: result.errors.length > 0 ? `${result.errors.length} errors occurred` : null,
        lastSyncAt: completedAt,
        lastSyncStatus: 'completed',
      });

      addLog(
        'info',
        `Sync completed: ${result.filesAdded} added, ${result.filesUpdated} updated, ${result.filesDeleted} deleted, ${result.filesSkipped} skipped`,
      );

      return result;
    } catch (error) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await this.integrationModel.updateSync(syncId, {
        completedAt,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        logs,
        status: 'failed',
      });

      await this.integrationModel.update(integrationId, {
        errorMessage: error instanceof Error ? error.message : String(error),
        lastSyncAt: completedAt,
        lastSyncStatus: 'failed',
      });

      addLog('error', `Sync failed: ${error}`);
      throw error;
    }
  }
}
