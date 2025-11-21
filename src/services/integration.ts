import { NextcloudConfig } from '@/database/schemas/integration';
import { lambdaClient } from '@/libs/trpc/client';

export interface CreateIntegrationParams {
  config: NextcloudConfig;
  description?: string;
  knowledgeBaseId: string;
  name: string;
  syncEnabled?: boolean;
  syncInterval?: number;
  type: 'nextcloud';
}

export interface UpdateIntegrationParams {
  config?: NextcloudConfig;
  description?: string;
  id: string;
  name?: string;
  status?: 'active' | 'inactive' | 'error';
  syncEnabled?: boolean;
  syncInterval?: number;
}

class IntegrationService {
  createIntegration = async (params: CreateIntegrationParams) => {
    return lambdaClient.integration.create.mutate(params);
  };

  getIntegrations = async () => {
    return lambdaClient.integration.list.query();
  };

  getIntegrationById = async (id: string) => {
    return lambdaClient.integration.getById.query({ id });
  };

  getIntegrationsByKnowledgeBaseId = async (knowledgeBaseId: string) => {
    return lambdaClient.integration.getByKnowledgeBaseId.query({ knowledgeBaseId });
  };

  updateIntegration = async (params: UpdateIntegrationParams) => {
    return lambdaClient.integration.update.mutate(params);
  };

  deleteIntegration = async (id: string) => {
    return lambdaClient.integration.delete.mutate({ id });
  };

  testConnection = async (id: string) => {
    return lambdaClient.integration.testConnection.mutate({ id });
  };

  syncIntegration = async (id: string) => {
    return lambdaClient.integration.sync.mutate({ id });
  };

  getSyncStatus = async (id: string, limit?: number) => {
    return lambdaClient.integration.getSyncStatus.query({ id, limit });
  };
}

export const integrationService = new IntegrationService();
