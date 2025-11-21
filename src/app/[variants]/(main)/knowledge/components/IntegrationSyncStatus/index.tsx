'use client';

import { Card, Descriptions, Tag, Timeline , Skeleton } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import useSWR from 'swr';

import { integrationService } from '@/services/integration';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    padding: 16px;
  `,
  logs: css`
    overflow-y: auto;
    max-height: 400px;
  `,
  statCard: css`
    padding: 16px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    text-align: center;
  `,
  statLabel: css`
    margin-block-start: 4px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  statValue: css`
    font-size: 24px;
    font-weight: bold;
    color: ${token.colorPrimary};
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-block-end: 16px;
  `,
}));

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed': {
      return 'success';
    }
    case 'running': {
      return 'processing';
    }
    case 'failed': {
      return 'error';
    }
    default: {
      return 'default';
    }
  }
};

interface IntegrationSyncStatusProps {
  integrationId: string;
}

const IntegrationSyncStatus = memo<IntegrationSyncStatusProps>(({ integrationId }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('knowledgeBase');

  const { data: syncStatus, isLoading } = useSWR(
    ['integration-sync-status', integrationId],
    () => integrationService.getSyncStatus(integrationId, 20),
    {
      refreshInterval: 5000, // Refresh every 5 seconds
    },
  );

  if (isLoading) {
    return <Skeleton active />;
  }

  const latestSync = syncStatus?.latestSync;
  const syncHistory = syncStatus?.syncHistory || [];

  return (
    <div className={styles.container}>
      {latestSync && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small" title={t('integration.sync.status')}>
            <Descriptions.Item label={t('integration.sync.lastSync')}>
              {latestSync.startedAt
                ? dayjs(latestSync.startedAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(latestSync.status)}>
                {latestSync.status ? t(`integration.list.syncStatus.${latestSync.status}`) : '-'}
              </Tag>
            </Descriptions.Item>
            {latestSync.duration && (
              <Descriptions.Item label="Duration">
                {Math.round(latestSync.duration / 1000)}s
              </Descriptions.Item>
            )}
            {latestSync.completedAt && (
              <Descriptions.Item label="Completed At">
                {dayjs(latestSync.completedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>

          {latestSync.filesAdded !== undefined && (
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{latestSync.filesAdded}</div>
                <div className={styles.statLabel}>{t('integration.sync.filesAdded')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{latestSync.filesUpdated}</div>
                <div className={styles.statLabel}>{t('integration.sync.filesUpdated')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{latestSync.filesDeleted}</div>
                <div className={styles.statLabel}>{t('integration.sync.filesDeleted')}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{latestSync.filesSkipped}</div>
                <div className={styles.statLabel}>{t('integration.sync.filesSkipped')}</div>
              </div>
            </div>
          )}

          {latestSync.errorMessage && (
            <div
              style={{
                background: 'var(--ant-color-error-bg)',
                borderRadius: 4,
                marginTop: 16,
                padding: 12,
              }}
            >
              <strong>Error:</strong> {latestSync.errorMessage}
            </div>
          )}
        </Card>
      )}

      {syncHistory.length > 0 && (
        <Card title="Sync History">
          <div className={styles.logs}>
            <Timeline
              items={syncHistory.slice(0, 10).map((sync) => ({
                children: (
                  <Flexbox gap={4}>
                    <div>
                      <strong>{dayjs(sync.startedAt).format('YYYY-MM-DD HH:mm:ss')}</strong>
                      <Tag color={getStatusColor(sync.status)} style={{ marginLeft: 8 }}>
                        {sync.status}
                      </Tag>
                    </div>
                    {sync.filesAdded !== undefined && (
                      <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
                        +{sync.filesAdded} / ↑{sync.filesUpdated} / ↓{sync.filesDeleted} / ⊘
                        {sync.filesSkipped}
                      </div>
                    )}
                    {sync.errorMessage && (
                      <div style={{ color: 'var(--ant-color-error)', fontSize: 12 }}>
                        {sync.errorMessage}
                      </div>
                    )}
                  </Flexbox>
                ),
                color: getStatusColor(sync.status),
              }))}
            />
          </div>
        </Card>
      )}

      {syncHistory.length === 0 && !latestSync && (
        <div style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>
          {t('integration.sync.noLogs')}
        </div>
      )}
    </div>
  );
});

IntegrationSyncStatus.displayName = 'IntegrationSyncStatus';

export default IntegrationSyncStatus;
