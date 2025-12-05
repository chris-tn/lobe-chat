import type { SWRResponse } from 'swr';
import type { PartialDeep } from 'type-fest';

import type { AgentState } from './slices/chat/initialState';
import type { LobeAgentChatConfig, LobeAgentConfig } from '@/types/agent';
import type { KnowledgeItem } from '@/types/knowledgeBase';
import type { AgentStoreState } from './initialState';

//  ===============  AgentChatAction Interface ============ //
// This interface is defined here to break circular dependency
// It cannot be in action.ts because action.ts needs AgentStore from this file

/**
 * 助手接口
 */
export interface AgentChatAction {
  addFilesToAgent: (fileIds: string[], boolean?: boolean) => Promise<void>;
  addKnowledgeBaseToAgent: (knowledgeBaseId: string) => Promise<void>;
  internal_createAbortController: (key: keyof AgentState) => AbortController;

  internal_dispatchAgentMap: (
    id: string,
    config: PartialDeep<LobeAgentConfig>,
    actions?: string,
  ) => void;
  internal_refreshAgentConfig: (id: string) => Promise<void>;
  internal_refreshAgentKnowledge: () => Promise<void>;
  internal_updateAgentConfig: (
    id: string,
    data: PartialDeep<LobeAgentConfig>,
    signal?: AbortSignal,
  ) => Promise<void>;
  removeFileFromAgent: (fileId: string) => Promise<void>;
  removeKnowledgeBaseFromAgent: (knowledgeBaseId: string) => Promise<void>;

  removePlugin: (id: string) => void;
  toggleFile: (id: string, open?: boolean) => Promise<void>;
  toggleKnowledgeBase: (id: string, open?: boolean) => Promise<void>;

  togglePlugin: (id: string, open?: boolean) => Promise<void>;
  updateAgentChatConfig: (config: Partial<LobeAgentChatConfig>) => Promise<void>;
  updateAgentConfig: (config: PartialDeep<LobeAgentConfig>) => Promise<void>;
  useFetchAgentConfig: (isLogin: boolean | undefined, id: string) => SWRResponse<LobeAgentConfig>;
  useFetchFilesAndKnowledgeBases: () => SWRResponse<KnowledgeItem[]>;
  useInitInboxAgentStore: (
    isLogin: boolean | undefined,
    defaultAgentConfig?: PartialDeep<LobeAgentConfig>,
  ) => SWRResponse<PartialDeep<LobeAgentConfig>>;
}

//  ===============  AgentStore Type Definition ============ //
// This file exists to break circular dependency between store.ts and slices/chat/action.ts
// Both files can import AgentStore from here without creating a circular dependency

export interface AgentStore extends AgentChatAction, AgentStoreState { }

