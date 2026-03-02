'use client';

import { Button } from '@lobehub/ui';
import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import ShareKnowledgeBaseModal from '@/features/ShareKnowledgeBaseModal';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const ShareKnowledgeBaseButton = ({ knowledgeBaseId }: { knowledgeBaseId?: string }) => {
  const { t } = useTranslation('chat');
  const isAdmin = useIsAdmin();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  if (!isAdmin || !knowledgeBaseId) return null;

  return (
    <>
      <Button icon={Share2} onClick={() => setIsShareModalOpen(true)}>
        {t('share.confirm')}
      </Button>
      <ShareKnowledgeBaseModal
        knowledgeBaseId={knowledgeBaseId}
        onClose={() => setIsShareModalOpen(false)}
        onSuccess={() => {
          // Modal will stay open to show updated share list
        }}
        open={isShareModalOpen}
      />
    </>
  );
};

export default ShareKnowledgeBaseButton;
