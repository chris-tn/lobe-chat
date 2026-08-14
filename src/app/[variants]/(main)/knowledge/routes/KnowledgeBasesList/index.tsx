'use client';

import { Button, Icon } from '@lobehub/ui';
import { Cloud } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';
import { useNavigate } from 'react-router-dom';

import PanelTitle from '@/components/PanelTitle';
import FilePanel from '@/features/FileSidePanel';

import KnowledgeBaseList from '../../components/KnowledgeBaseList';

/**
 * Knowledge Bases List Page
 * Shows all available knowledge bases
 */
const KnowledgeBasesListPage = memo(() => {
  const { t } = useTranslation(['file', 'knowledgeBase']);
  const navigate = useNavigate();

  return (
    <>
      <FilePanel>
        <Flexbox gap={16} height={'100%'} paddingInline={8}>
          <PanelTitle title={t('knowledgeBase.title', { ns: 'file' })} />
          <Button
            block
            icon={<Icon icon={Cloud} />}
            onClick={() => navigate('/integrations')}
            type="default"
          >
            {t('integration.title', { ns: 'knowledgeBase' })}
          </Button>
          <KnowledgeBaseList />
        </Flexbox>
      </FilePanel>
      <Flexbox
        align="center"
        flex={1}
        justify="center"
        style={{ overflow: 'hidden', position: 'relative' }}
      >
        <div>Select a knowledge base to view details</div>
      </Flexbox>
    </>
  );
});

KnowledgeBasesListPage.displayName = 'KnowledgeBasesListPage';

export default KnowledgeBasesListPage;
