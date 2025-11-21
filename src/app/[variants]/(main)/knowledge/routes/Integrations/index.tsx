'use client';

import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { message } from '@/components/AntdStaticMethods';
import PanelTitle from '@/components/PanelTitle';
import FilePanel from '@/features/FileSidePanel';
import { integrationService } from '@/services/integration';

import IntegrationDetail from '../../components/IntegrationDetail';
import IntegrationList from '../../components/IntegrationList';

/**
 * Integrations Page
 * Shows all integrations and allows creating new ones
 */
const IntegrationsPage = memo(() => {
  const { t } = useTranslation('knowledgeBase');
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const handleDelete = async (id: string) => {
    try {
      await integrationService.deleteIntegration(id);
      message.success(t('integration.delete.success'));
      if (selectedId === id) {
        setSelectedId(undefined);
      }
    } catch (error) {
      message.error('Failed to delete integration');
      console.error(error);
    }
  };

  const handleSync = async (id: string) => {
    try {
      message.loading({ content: t('integration.sync.syncing'), key: 'sync' });
      await integrationService.syncIntegration(id);
      message.success({ content: t('integration.sync.success'), key: 'sync' });
    } catch (error) {
      message.error({ content: 'Sync failed', key: 'sync' });
      console.error(error);
    }
  };

  return (
    <>
      <FilePanel>
        <Flexbox gap={16} height={'100%'} paddingInline={8}>
          <PanelTitle title={t('integration.title')} />
          <IntegrationList onSelect={setSelectedId} selectedId={selectedId} />
        </Flexbox>
      </FilePanel>
      <Flexbox flex={1} style={{ overflow: 'hidden', position: 'relative' }}>
        {selectedId ? (
          <IntegrationDetail
            integrationId={selectedId}
            onDelete={handleDelete}
            onSync={handleSync}
          />
        ) : (
          <Flexbox align="center" justify="center" style={{ height: '100%' }}>
            <div style={{ color: 'var(--ant-color-text-secondary)' }}>
              {t('integration.detail.selectIntegration')}
            </div>
          </Flexbox>
        )}
      </Flexbox>
    </>
  );
});

IntegrationsPage.displayName = 'IntegrationsPage';

export default IntegrationsPage;
