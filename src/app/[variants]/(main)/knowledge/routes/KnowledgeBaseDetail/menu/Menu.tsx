'use client';

import { Button, Icon } from '@lobehub/ui';
import { Cloud } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';
import { useNavigate } from 'react-router-dom';

import Head from './Head';
import MenuItems from './MenuItems';

const Menu = memo<{ id: string }>(({ id }) => {
  const { t } = useTranslation('knowledgeBase');
  const navigate = useNavigate();

  return (
    <Flexbox gap={16} height={'100%'} paddingInline={12} style={{ paddingTop: 12 }}>
      <Head id={id} />
      <Button
        block
        icon={<Icon icon={Cloud} />}
        onClick={() => navigate('/integrations')}
        type="default"
      >
        {t('integration.title')}
      </Button>
      <MenuItems />
    </Flexbox>
  );
});

Menu.displayName = 'Menu';

export default Menu;
