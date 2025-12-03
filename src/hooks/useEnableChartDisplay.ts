import { useSyncExternalStore } from 'react';

const getSnapshot = () => {
  if (typeof window === 'undefined' || !window.global_serverConfigStore) {
    return false;
  }
  return window.global_serverConfigStore.getState().featureFlags.enableChartDisplay ?? false;
};

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined' || !window.global_serverConfigStore) {
    return () => {};
  }
  return window.global_serverConfigStore.subscribe(callback);
};

/**
 * Hook to get enableChartDisplay feature flag
 * Uses window.global_serverConfigStore directly to avoid potential circular imports
 */
export const useEnableChartDisplay = () => {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

