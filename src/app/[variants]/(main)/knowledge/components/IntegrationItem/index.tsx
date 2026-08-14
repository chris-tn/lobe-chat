'use client';

import { Button, Icon } from '@lobehub/ui';
import { Modal, Popconfirm, Tag, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import { Cloud, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';

import { message } from '@/components/AntdStaticMethods';
import { IntegrationItem as IntegrationItemType } from '@/database/schemas/integration';
import { integrationService } from '@/services/integration';

import IntegrationSyncStatus from '../IntegrationSyncStatus';

const useStyles = createStyles(({ css, token }) => ({
  description: css`
    margin-block-end: 8px;
    font-size: 12px;
    color: ${token.colorTextSecondary};
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-block-start: 8px;
    padding-block-start: 8px;
    border-block-start: 1px solid ${token.colorBorder};
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-end: 8px;
  `,
  item: css`
    cursor: pointer;

    padding: 12px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;

    transition: all 0.2s;

    &:hover {
      border-color: ${token.colorPrimary};
      background: ${token.colorFillTertiary};
    }
  `,
  title: css`
    font-size: 14px;
    font-weight: 500;
  `,
}));

interface IntegrationItemProps {
  integration: IntegrationItemType;
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  onSync: (id: string) => void;
  selected?: boolean;
}

const IntegrationItem = memo<IntegrationItemProps>(
  ({ integration, onDelete, onSync, onSelect, selected }) => {
    const { styles } = useStyles();
    const { t } = useTranslation('knowledgeBase');
    const [syncStatusOpen, setSyncStatusOpen] = useState(false);

    const statusColor = {
      active: 'success',
      error: 'error',
      inactive: 'default',
    }[integration.status] as 'success' | 'default' | 'error';

    const handleTestConnection = async () => {
      try {
        message.loading({ content: 'Testing connection...', key: 'test' });
        const result = await integrationService.testConnection(integration.id);
        if (result?.valid) {
          message.success({ content: 'Connection successful', key: 'test' });
        } else {
          message.error({ content: 'Connection failed', key: 'test' });
        }
      } catch (error) {
        message.error({ content: 'Connection test failed', key: 'test' });
        console.error(error);
      }
    };

    return (
      <>
        <div
          className={styles.item}
          onClick={() => onSelect?.(integration.id)}
          style={
            selected
              ? {
                  background: 'var(--ant-color-fill-tertiary)',
                  borderColor: 'var(--ant-color-primary)',
                }
              : undefined
          }
        >
          <div className={styles.header}>
            <Flexbox gap={8} horizontal>
              <Icon icon={Cloud} />
              <span className={styles.title}>{integration.name}</span>
              <Tag color={statusColor}>{t(`integration.list.status.${integration.status}`)}</Tag>
            </Flexbox>
          </div>

          {integration.description && (
            <div className={styles.description}>{integration.description}</div>
          )}

          <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
            Type: {integration.type} | KB: {integration.knowledgeBaseId.slice(0, 8)}...
          </div>

          <div className={styles.footer}>
            <Flexbox gap={4} horizontal>
              <Tooltip title="Sync now">
                <Button
                  icon={<Icon icon={RefreshCw} />}
                  onClick={() => onSync(integration.id)}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="View sync status">
                <Button
                  icon={<Icon icon={Settings} />}
                  onClick={() => setSyncStatusOpen(true)}
                  size="small"
                  type="text"
                />
              </Tooltip>
              <Tooltip title="Test connection">
                <Button onClick={handleTestConnection} size="small" type="text">
                  Test
                </Button>
              </Tooltip>
              <Popconfirm
                onConfirm={() => onDelete(integration.id)}
                title={t('integration.delete.title')}
              >
                <Tooltip title="Delete">
                  <Button danger icon={<Icon icon={Trash2} />} size="small" type="text" />
                </Tooltip>
              </Popconfirm>
            </Flexbox>

            {integration.lastSyncAt && (
              <div style={{ color: 'var(--ant-color-text-tertiary)', fontSize: 11 }}>
                {t('integration.sync.lastSync')}: {dayjs(integration.lastSyncAt).fromNow()}
              </div>
            )}
          </div>
        </div>

        <Modal
          footer={null}
          onCancel={() => setSyncStatusOpen(false)}
          open={syncStatusOpen}
          title={`${integration.name} - ${t('integration.sync.title')}`}
          width={800}
        >
          <IntegrationSyncStatus integrationId={integration.id} />
        </Modal>
      </>
    );
  },
);

IntegrationItem.displayName = 'IntegrationItem';

export default IntegrationItem;
