'use client';

import { memo } from 'react';
import { FlexboxProps } from 'react-layout-kit';

// DxAi - Hide external branding watermark
const BrandWatermark = memo<Omit<FlexboxProps, 'children'>>(() => {
  return null; // Hide watermark for DxAi
});

BrandWatermark.displayName = 'BrandWatermark';

export default BrandWatermark;