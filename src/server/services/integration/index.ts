import { LobeChatDatabase } from '@lobechat/database';
import { TRPCError } from '@trpc/server';
import debug from 'debug';

import { IntegrationModel } from '@/database/models/integration';
import { KnowledgeBaseModel } from '@/database/models/knowledgeBase';
import {
  IntegrationItem,
  NewIntegration,
  NextcloudConfig,
} from '@/database/schemas/integration';

import { NextcloudService } from './nextcloud';

const log = debug('lobe-chat:service:integration');

export class IntegrationService {
  private db: LobeChatDatabase;
  private userId: string;
  private integrationModel: IntegrationModel;
  private knowledgeBaseModel: KnowledgeBaseModel;

  constructor(db: LobeChatDatabase, userId: string) {
    this.db = db;
    this.userId = userId;
    this.integrationModel = new IntegrationModel(db, userId);
    this.knowledgeBaseModel = new KnowledgeBaseModel(db, userId);
  }

  /**
   * Validate Nextcloud configuration
   */
  async validateNextcloudConfig(config: NextcloudConfig): Promise<boolean> {
    try {
      const nextcloudService = new NextcloudService(config);
      return await nextcloudService.testConnection();
    } catch (error) {
      log('Nextcloud config validation failed: %O', error);
      return false;
    }
  }

  /**
   * Create a new integration
   */
  async createIntegration(
    params: Omit<NewIntegration, 'userId' | 'id' | 'createdAt' | 'updatedAt' | 'accessedAt'>,
  ): Promise<IntegrationItem> {
    // Validate knowledge base exists and user has access
    const kb = await this.knowledgeBaseModel.findById(params.knowledgeBaseId);
    if (!kb) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Knowledge base not found',
      });
    }

    // Validate integration config based on type
    if (params.type === 'nextcloud') {
      const config = params.config as NextcloudConfig;
      const isValid = await this.validateNextcloudConfig(config);
      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Nextcloud configuration. Please check your credentials and URL.',
        });
      }
    }

    const integration = await this.integrationModel.create(params);
    log('Created integration: %s', integration.id);
    return integration;
  }

  /**
   * Get all integrations for user
   */
  async getIntegrations(): Promise<IntegrationItem[]> {
    return this.integrationModel.query();
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(id: string): Promise<IntegrationItem | undefined> {
    return this.integrationModel.findById(id);
  }

  /**
   * Get integrations by knowledge base ID
   */
  async getIntegrationsByKnowledgeBaseId(knowledgeBaseId: string): Promise<IntegrationItem[]> {
    return this.integrationModel.findByKnowledgeBaseId(knowledgeBaseId);
  }

  /**
   * Update integration
   */
  async updateIntegration(id: string, updates: Partial<IntegrationItem>): Promise<IntegrationItem> {
    const integration = await this.integrationModel.findById(id);
    if (!integration) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Integration not found',
      });
    }

    // If config is being updated, validate it
    if (updates.config && integration.type === 'nextcloud') {
      const config = updates.config as NextcloudConfig;
      const isValid = await this.validateNextcloudConfig(config);
      if (!isValid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid Nextcloud configuration. Please check your credentials and URL.',
        });
      }
    }

    await this.integrationModel.update(id, updates);
    const updated = await this.integrationModel.findById(id);
    if (!updated) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve updated integration',
      });
    }

    log('Updated integration: %s', id);
    return updated;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: string): Promise<void> {
    const integration = await this.integrationModel.findById(id);
    if (!integration) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Integration not found',
      });
    }

    await this.integrationModel.delete(id);
    log('Deleted integration: %s', id);
  }

  /**
   * Test integration connection
   */
  async testIntegration(id: string): Promise<boolean> {
    const integration = await this.integrationModel.findById(id);
    if (!integration) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Integration not found',
      });
    }

    if (integration.type === 'nextcloud') {
      const config = integration.config as NextcloudConfig;
      return this.validateNextcloudConfig(config);
    }

    return false;
  }
}
