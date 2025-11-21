'use client';

import { Icon } from '@lobehub/ui';
import { Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

const EmptyStatus = () => {
  const { t } = useTranslation('knowledgeBase');

  return (
    <Flexbox align="center" gap={8} justify="center" style={{ padding: 24 }}>
      <Icon icon={Cloud} size={48} style={{ opacity: 0.3 }} />
      <div style={{ opacity: 0.5, textAlign: 'center' }}>{t('integration.list.empty')}</div>
    </Flexbox>
  );
};

export default EmptyStatus;
