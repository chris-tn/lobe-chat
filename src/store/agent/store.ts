import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';

import { createDevtools } from '../middleware/createDevtools';
import { initialState } from './initialState';
import { createChatSlice } from './slices/chat/action';
import type { AgentStore } from './types';

const createStore: StateCreator<AgentStore, [['zustand/devtools', never]]> = (set, get) => ({
  ...initialState,
  ...createChatSlice(set, get),
});

//  ===============  implement useStore ============ //

const devtools = createDevtools('agent');

export const useAgentStore = createWithEqualityFn<AgentStore>()(devtools(createStore), shallow);

export const getAgentStoreState = () => useAgentStore.getState();
