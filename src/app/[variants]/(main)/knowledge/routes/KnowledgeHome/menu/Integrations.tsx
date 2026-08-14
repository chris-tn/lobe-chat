import { Icon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Cloud } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';
import { useLocation, useNavigate } from 'react-router-dom';

const useStyles = createStyles(({ css, token }) => ({
  active: css`
    color: ${token.colorPrimary};
    background: ${token.colorFillTertiary};
  `,
  header: css`
    cursor: pointer;
    color: ${token.colorTextDescription};
    transition: all 0.2s;

    &:hover {
      color: ${token.colorText};
      background: ${token.colorFillTertiary};
    }
  `,
}));

const Integrations = memo(() => {
  const { t } = useTranslation('knowledgeBase');
  const { styles, cx } = useStyles();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive =
    location.pathname === '/integrations' || location.pathname.includes('/integrations');

  const handleClick = () => {
    navigate('/integrations');
  };

  return (
    <Flexbox gap={8}>
      <Flexbox
        align={'center'}
        className={cx(styles.header, isActive && styles.active)}
        horizontal
        justify={'space-between'}
        onClick={handleClick}
        paddingInline={'16px 12px'}
        style={{ borderRadius: 4 }}
      >
        <Flexbox align={'center'} gap={8} horizontal>
          <Icon icon={Cloud} />
          <div style={{ lineHeight: '14px' }}>{t('integration.title')}</div>
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
});

Integrations.displayName = 'Integrations';

export default Integrations;
