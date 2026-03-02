import DxaiChart from './DxaiChart';
import LobeArtifact from './LobeArtifact';
import LobeThinking from './LobeThinking';
import LocalFile from './LocalFile';
import Mention from './Mention';
import Thinking from './Thinking';
import { type MarkdownElement } from './type';

export type { MarkdownElement } from './type';

const baseElements: MarkdownElement[] = [
  Thinking,
  LobeArtifact,
  LobeThinking,
  LocalFile,
  Mention,
];

/**
 * Get markdown elements with feature flag support
 * This function checks the chart_display feature flag and conditionally includes DxaiChart
 */
export const getMarkdownElements = (): MarkdownElement[] => {
  try {
    if (typeof window !== 'undefined' && window.global_serverConfigStore) {
      const { enableChartDisplay } = window.global_serverConfigStore.getState().featureFlags;
      return enableChartDisplay ? [...baseElements, DxaiChart] : baseElements;
    }
    // Fallback if store is not initialized yet
    return baseElements;
  } catch {
    // Fallback if store is not initialized yet
    return baseElements;
  }
};

/**
 * Get markdown elements - checks feature flag at call time
 * Use this in components via useMemo for reactive updates
 * @deprecated Use getMarkdownElements() instead
 */
export const markdownElements = getMarkdownElements();
