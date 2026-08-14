'use client';

import { Icon } from '@lobehub/ui';
import { Button, Card, Descriptions, Space, Tag } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { RefreshCw, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';
import useSWR from 'swr';

import { integrationService } from '@/services/integration';

import IntegrationSyncStatus from '../IntegrationSyncStatus';

const useStyles = createStyles(({ css }) => ({
  container: css`
    overflow-y: auto;
    height: 100%;
    padding: 24px;
  `,
  header: css`
    margin-block-end: 24px;
  `,
  section: css`
    margin-block-end: 24px;
  `,
}));

interface IntegrationDetailProps {
  integrationId: string;
  onDelete: (id: string) => void;
  onSync: (id: string) => void;
}

const IntegrationDetail = memo<IntegrationDetailProps>(({ integrationId, onSync, onDelete }) => {
  const { styles } = useStyles();
  const { t } = useTranslation('knowledgeBase');

  const { data: integration, isLoading } = useSWR(['integration', integrationId], () =>
    integrationService.getIntegrationById(integrationId),
  );

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className={styles.container}>
        <div>Integration not found</div>
      </div>
    );
  }

  const statusColor = {
    active: 'success',
    error: 'error',
    inactive: 'default',
  }[integration.status] as 'success' | 'default' | 'error';

  const config = integration.config as any;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Flexbox align="center" distribution="space-between" horizontal>
          <h2 style={{ margin: 0 }}>{integration.name}</h2>
          <Space>
            <Button
              icon={<Icon icon={RefreshCw} />}
              onClick={() => onSync(integration.id)}
              type="primary"
            >
              {t('integration.sync.button')}
            </Button>
            <Button danger icon={<Icon icon={Trash2} />} onClick={() => onDelete(integration.id)}>
              {t('integration.delete.confirmButton')}
            </Button>
          </Space>
        </Flexbox>
      </div>

      <div className={styles.section}>
        <Card title={t('integration.detail.basicInfo')}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={t('integration.detail.name')}>
              {integration.name}
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.description')}>
              {integration.description || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.type')}>
              {integration.type}
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.status')}>
              <Tag color={statusColor}>{t(`integration.list.status.${integration.status}`)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.knowledgeBase')}>
              {integration.knowledgeBaseId}
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.syncEnabled')}>
              {integration.syncEnabled
                ? t('integration.detail.enabled')
                : t('integration.detail.disabled')}
            </Descriptions.Item>
            <Descriptions.Item label={t('integration.detail.syncInterval')}>
              {integration.syncInterval
                ? `${integration.syncInterval}s (${Math.floor(integration.syncInterval / 60)}min)`
                : '-'}
            </Descriptions.Item>
            {integration.lastSyncAt && (
              <Descriptions.Item label={t('integration.sync.lastSync')}>
                {dayjs(integration.lastSyncAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>

      {integration.type === 'nextcloud' && (
        <div className={styles.section}>
          <Card title={t('integration.detail.nextcloudConfig')}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={t('integration.create.nextcloud.url.label')}>
                {config?.url || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('integration.create.nextcloud.username.label')}>
                {config?.username || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('integration.create.nextcloud.folderPath.label')}>
                {config?.folderPath || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </div>
      )}

      <div className={styles.section}>
        <Card title={t('integration.sync.title')}>
          <IntegrationSyncStatus integrationId={integration.id} />
        </Card>
      </div>
    </div>
  );
});

IntegrationDetail.displayName = 'IntegrationDetail';

export default IntegrationDetail;
