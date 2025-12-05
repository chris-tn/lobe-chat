'use client';

import { Alert } from 'antd';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { appEnv } from '@/envs/app';

const RocketChatEmbed = memo(() => {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rocketChatUrl = appEnv.NEXT_PUBLIC_ROCKETCHAT_TEAMS_URL;

  if (!rocketChatUrl) {
    return (
      <Flexbox align="center" height="100vh" justify="center" padding={24}>
        <Alert
          message="Configuration Error"
          description="RocketChat Teams URL is not configured. Please set NEXT_PUBLIC_ROCKETCHAT_TEAMS_URL environment variable."
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
          setError('Failed to load RocketChat Teams');
          setLoading(false);
        }}
        onLoad={() => {
          setLoading(false);
          setError(null);
        }}
        src={rocketChatUrl}
        style={{
          border: 0,
          height: '100vh',
          width: '100%',
        }}
        title="RocketChat Teams"
        width="100%"
      />
    </Flexbox>
  );
});

RocketChatEmbed.displayName = 'RocketChatEmbed';

export default RocketChatEmbed;

