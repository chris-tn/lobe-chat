'use client';

import dynamic from 'next/dynamic';

import { BrandTextLoading } from '@/components/Loading';

const CustomRouter = dynamic(() => import('../CustomRouter'), {
    loading: BrandTextLoading,
    ssr: false,
});

export default CustomRouter;

