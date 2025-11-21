import debug from 'debug';
import { FileStat, WebDAVClient, createClient } from 'webdav';

import { NextcloudConfig } from '@/database/schemas/integration';

const log = debug('lobe-chat:service:integration:nextcloud');

export interface NextcloudFileInfo {
  basename: string;
  etag?: string;
  filename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
}

export class NextcloudService {
  private client: WebDAVClient;
  private config: NextcloudConfig;

  constructor(config: NextcloudConfig) {
    this.config = config;

    // Normalize URL - ensure it ends with /remote.php/dav/files/{username}/
    let baseURL = config.url.trim();
    if (!baseURL.endsWith('/')) {
      baseURL += '/';
    }

    // If URL doesn't contain the WebDAV path, append it
    if (!baseURL.includes('/remote.php/dav/')) {
      baseURL += 'remote.php/dav/files/' + encodeURIComponent(config.username) + '/';
    }

    log('Initializing Nextcloud WebDAV client for URL: %s', baseURL);

    this.client = createClient(baseURL, {
      password: config.password,
      username: config.username,
    });
  }

  /**
   * Test connection to Nextcloud
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getDirectoryContents('/');
      return true;
    } catch (error) {
      log('Connection test failed: %O', error);
      return false;
    }
  }

  /**
   * List files in the configured folder
   */
  async listFiles(folderPath?: string): Promise<NextcloudFileInfo[]> {
    const path = folderPath || this.config.folderPath || '/';
    log('Listing files in path: %s', path);

    try {
      const contents = await this.client.getDirectoryContents(path, {
        deep: true,
      });

      const files: NextcloudFileInfo[] = [];

      const processItem = (item: FileStat, basePath: string = '') => {
        const fullPath = basePath ? `${basePath}/${item.filename}` : item.filename;

        if (item.type === 'file') {
          files.push({
            basename: item.basename,
            etag: item.etag || undefined,
            filename: fullPath,
            lastmod: item.lastmod || '',
            size: item.size || 0,
            type: 'file',
          });
        } else if (item.type === 'directory' && Array.isArray(item)) {
          // Recursively process directory contents
          item.forEach((subItem) => processItem(subItem, fullPath));
        }
      };

      // Handle both single items and arrays
      if (Array.isArray(contents)) {
        contents.forEach((item) => processItem(item));
      } else {
        // Handle ResponseDataDetailed type
        const contentItem = 'data' in contents ? contents.data : contents;
        if (Array.isArray(contentItem)) {
          contentItem.forEach((item) => processItem(item));
        } else {
          processItem(contentItem);
        }
      }

      log('Found %d files', files.length);
      return files;
    } catch (error) {
      log('Error listing files: %O', error);
      throw new Error(
        `Failed to list files from Nextcloud: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Download a file from Nextcloud
   */
  async downloadFile(remotePath: string): Promise<Buffer> {
    log('Downloading file: %s', remotePath);

    try {
      const buffer = (await this.client.getFileContents(remotePath, {
        format: 'binary',
      })) as Buffer;

      log('Downloaded file: %s, size: %d bytes', remotePath, buffer.length);
      return buffer;
    } catch (error) {
      log('Error downloading file: %O', error);
      throw new Error(
        `Failed to download file from Nextcloud: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get file metadata
   */
  async getFileStat(remotePath: string): Promise<FileStat | null> {
    try {
      const stat = await this.client.stat(remotePath);
      // Handle ResponseDataDetailed type
      if ('data' in stat) {
        return stat.data as FileStat;
      }
      return stat as FileStat;
    } catch (error) {
      log('Error getting file stat: %O', error);
      return null;
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(remotePath: string): Promise<boolean> {
    try {
      await this.client.stat(remotePath);
      return true;
    } catch {
      return false;
    }
  }
}
