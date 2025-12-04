import type { AgentStoreState } from './initialState';
import type { AgentChatAction } from './slices/chat/action';

//  ===============  AgentStore Type Definition ============ //
// This file exists to break circular dependency between store.ts and slices/chat/action.ts
// Both files can import AgentStore from here without creating a circular dependency

export interface AgentStore extends AgentChatAction, AgentStoreState {}

