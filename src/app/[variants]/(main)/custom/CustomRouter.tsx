'use client';

import { App } from 'antd';
import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';

import { parseCustomTabsConfig } from '@/types/customTabs';

import CustomTabEmbed from './features/CustomTabEmbed';

/**
 * Main Custom Router component - renders content based on URL directly
 */
const CustomRouter = memo(() => {
    const customTabs = parseCustomTabsConfig();
    const pathname = usePathname();

    // Extract tab ID from pathname
    const currentTabId = useMemo(() => {
        // Try to match /custom/tabId pattern
        const match = pathname.match(/\/custom\/([^/?]+)/);
        if (match) return match[1];

        // Also check window.location for browser URL
        if (typeof window !== 'undefined') {
            const browserMatch = window.location.pathname.match(/\/custom\/([^/?]+)/);
            if (browserMatch) return browserMatch[1];
        }

        return null;
    }, [pathname]);

    console.log('[CustomRouter] pathname:', pathname, 'currentTabId:', currentTabId);

    // If no custom tabs configured, show error
    if (customTabs.length === 0) {
        return (
            <App style={{ display: 'flex', flex: 1, height: '100%' }}>
                <CustomTabEmbed
                    errorMessage="No custom tabs configured. Please set NEXT_PUBLIC_CUSTOM_TABS environment variable."
                    title="Configuration Error"
                    url=""
                />
            </App>
        );
    }

    // Find current tab or default to first
    const tabId = currentTabId || customTabs[0].id;
    const currentTab = customTabs.find((t) => t.id === tabId);

    console.log('[CustomRouter] Rendering tab:', tabId, currentTab?.name);

    if (!currentTab) {
        return (
            <App style={{ display: 'flex', flex: 1, height: '100%' }}>
                <CustomTabEmbed
                    errorMessage={`Tab "${tabId}" not found. Available tabs: ${customTabs.map((t) => t.id).join(', ')}`}
                    title="Not Found"
                    url=""
                />
            </App>
        );
    }

    // Use key to force iframe remount when tab changes
    return (
        <App key={currentTab.id} style={{ display: 'flex', flex: 1, height: '100%' }}>
            <CustomTabEmbed title={currentTab.name} url={currentTab.url} />
        </App>
    );
});

CustomRouter.displayName = 'CustomRouter';

export default CustomRouter;

