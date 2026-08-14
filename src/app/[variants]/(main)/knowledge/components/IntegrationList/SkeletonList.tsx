'use client';

import { Skeleton } from 'antd';
import { Flexbox } from '@lobehub/ui';

export const SkeletonList = () => {
  return (
    <Flexbox gap={8}>
      <Skeleton.Button active block style={{ height: 40 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton.Button active block key={i} style={{ height: 60 }} />
      ))}
    </Flexbox>
  );
};
