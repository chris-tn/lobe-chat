import { FC } from 'react';

import { MarkdownElement, MarkdownElementProps } from '../type';
import Component from './Render';
import rehypePlugin from './rehypePlugin';

const CHART_TAG = 'dxai-chart';

const DxaiChartElement: MarkdownElement = {
  Component: Component as unknown as FC<MarkdownElementProps>,
  rehypePlugin,
  scope: 'assistant',
  tag: CHART_TAG,
};

export default DxaiChartElement;

