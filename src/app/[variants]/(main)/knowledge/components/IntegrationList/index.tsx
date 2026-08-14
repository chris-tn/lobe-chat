'use client';

import { Button, Icon } from '@lobehub/ui';
import { Plus } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';
import useSWR from 'swr';

import { message } from '@/components/AntdStaticMethods';
import { integrationService } from '@/services/integration';

import CreateIntegrationModal from '../CreateIntegrationModal';
import IntegrationItem from '../IntegrationItem';
import EmptyStatus from './EmptyStatus';
import { SkeletonList } from './SkeletonList';

interface IntegrationListProps {
  onSelect?: (id: string) => void;
  selectedId?: string;
}

const IntegrationList = memo<IntegrationListProps>(({ onSelect, selectedId }) => {
  const { t } = useTranslation('knowledgeBase');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const {
    data: integrations,
    isLoading,
    mutate,
  } = useSWR('integrations', () => integrationService.getIntegrations(), {
    revalidateOnFocus: false,
  });

  const handleDelete = async (id: string) => {
    try {
      await integrationService.deleteIntegration(id);
      message.success(t('integration.list.actions.delete') + ' success');
      mutate();
    } catch (error) {
      message.error('Failed to delete integration');
      console.error(error);
    }
  };

  const handleSync = async (id: string) => {
    try {
      message.loading({ content: t('integration.sync.syncing'), key: 'sync' });
      await integrationService.syncIntegration(id);
      message.success({ content: 'Sync completed', key: 'sync' });
      mutate();
    } catch (error) {
      message.error({ content: 'Sync failed', key: 'sync' });
      console.error(error);
    }
  };

  if (isLoading) return <SkeletonList />;

  return (
    <Flexbox gap={8} height={'100%'}>
      <Button
        block
        icon={<Icon icon={Plus} />}
        onClick={() => setCreateModalOpen(true)}
        type={'primary'}
      >
        {t('integration.create.title')}
      </Button>

      {integrations?.length === 0 ? (
        <EmptyStatus />
      ) : (
        <Flexbox gap={8} style={{ flex: 1, overflow: 'auto' }}>
          {integrations?.map((integration) => (
            <IntegrationItem
              integration={integration}
              key={integration.id}
              onDelete={handleDelete}
              onSelect={onSelect}
              onSync={handleSync}
              selected={selectedId === integration.id}
            />
          ))}
        </Flexbox>
      )}

      <CreateIntegrationModal
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          setCreateModalOpen(false);
          mutate();
        }}
        open={createModalOpen}
      />
    </Flexbox>
  );
});

IntegrationList.displayName = 'IntegrationList';

export default IntegrationList;
