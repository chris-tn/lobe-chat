import { appEnv } from '@/envs/app';

export interface CustomTab {
    id: string;
    name: string;
    url: string;
    icon: string;
}

/**
 * Parse custom tabs configuration from environment variable
 * Format: name:icon:url,name:icon:url
 * Example: Teams:Users:https://teams.dxai.vn,Slack:MessageSquare:https://slack.com
 */
export const parseCustomTabsConfig = (): CustomTab[] => {
    const config = appEnv.NEXT_PUBLIC_CUSTOM_TABS;

    // Debug logging (works in both client and server)
    console.log('[CustomTabs] Env config:', config);

    if (!config || !config.trim()) {
        console.warn('[CustomTabs] No config found or config is empty');
        return [];
    }

    const tabs: CustomTab[] = [];
    const tabEntries = config.split(',').map((entry: string) => entry.trim()).filter(Boolean);

    for (const entry of tabEntries) {
        // Split by ':' but only at the first two occurrences to handle URLs with ':' in them
        // Format: name:icon:url (URL at the end makes parsing easier)
        const firstColonIndex = entry.indexOf(':');
        if (firstColonIndex === -1) {
            console.warn(`Invalid custom tab entry: ${entry}. Expected format: name:icon:url`);
            continue;
        }

        const secondColonIndex = entry.indexOf(':', firstColonIndex + 1);
        if (secondColonIndex === -1) {
            console.warn(`Invalid custom tab entry: ${entry}. Expected format: name:icon:url`);
            continue;
        }

        const name = entry.slice(0, firstColonIndex).trim();
        const icon = entry.slice(firstColonIndex + 1, secondColonIndex).trim();
        const url = entry.slice(secondColonIndex + 1).trim();

        if (!name || !icon || !url) {
            console.warn(`Invalid custom tab entry: ${entry}. All parts (name, icon, url) are required`);
            continue;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            console.warn(`Invalid URL in custom tab entry: ${entry}. URL: ${url}`);
            continue;
        }

        // Generate ID from name (slug format)
        const id = name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

        if (!id) {
            console.warn(`Invalid tab name: ${name}. Cannot generate valid ID`);
            continue;
        }

        tabs.push({
            id,
            name,
            url,
            icon,
        });
    }

    console.log('[CustomTabs] Parsed tabs:', tabs.map((t) => ({ id: t.id, name: t.name, url: t.url })));

    return tabs;
};

