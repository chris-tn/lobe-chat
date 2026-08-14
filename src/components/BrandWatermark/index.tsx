'use client';

import { type FlexboxProps } from '@lobehub/ui';
import { memo } from 'react';

// DxAi - Hide external branding watermark
const BrandWatermark = memo<Omit<FlexboxProps, 'children'>>(() => {
  return null;
});

BrandWatermark.displayName = 'BrandWatermark';

export default BrandWatermark;
