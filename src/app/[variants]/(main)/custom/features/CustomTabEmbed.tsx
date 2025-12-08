'use client';

import { Alert } from 'antd';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

interface CustomTabEmbedProps {
    errorMessage?: string;
    title: string;
    url: string;
}

const CustomTabEmbed = memo<CustomTabEmbedProps>(({ errorMessage, title, url }) => {
    const { t } = useTranslation('common');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    if (!url || errorMessage) {
        return (
            <Flexbox align="center" height="100vh" justify="center" padding={24}>
                <Alert
                    description={errorMessage || `${title} URL is not configured.`}
                    message={title || 'Configuration Error'}
                    type="error"
                />
            </Flexbox>
        );
    }

    return (
        <Flexbox height="100vh" style={{ position: 'relative', width: '100%' }}>
            {loading && (
                <Flexbox
                    align="center"
                    height="100%"
                    justify="center"
                    style={{ position: 'absolute', width: '100%', zIndex: 1 }}
                >
                    <div>{t('loading')}</div>
                </Flexbox>
            )}
            {error && (
                <Flexbox
                    align="center"
                    height="100%"
                    justify="center"
                    padding={24}
                    style={{ position: 'absolute', width: '100%', zIndex: 2 }}
                >
                    <Alert description={error} message="Error" type="error" />
                </Flexbox>
            )}
            <iframe
                allow="fullscreen"
                allowFullScreen
                height="100%"
                onError={() => {
                    setError(`Failed to load ${title}`);
                    setLoading(false);
                }}
                onLoad={() => {
                    setLoading(false);
                    setError(null);
                }}
                src={url}
                style={{
                    border: 0,
                    height: '100vh',
                    width: '100%',
                }}
                title={title}
                width="100%"
            />
        </Flexbox>
    );
});

CustomTabEmbed.displayName = 'CustomTabEmbed';

export default CustomTabEmbed;

