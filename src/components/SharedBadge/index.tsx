import { Icon, Tag } from '@lobehub/ui';
import { Globe, Users } from 'lucide-react';
import { CSSProperties, memo } from 'react';
import { useTranslation } from 'react-i18next';

interface SharedBadgeProps {
  isGlobal?: boolean;
  sharedBy?: string;
  style?: CSSProperties;
}

const SharedBadge = memo<SharedBadgeProps>(({ isGlobal, sharedBy, style }) => {
  const { t } = useTranslation('chat');

  if (isGlobal) {
    return (
      <Tag
        icon={<Icon icon={Globe} />}
        style={{
          fontSize: 12,
          ...style,
        }}
      >
        {t('share.sharedGlobal')}
      </Tag>
    );
  }

  if (sharedBy) {
    return (
      <Tag
        icon={<Icon icon={Users} />}
        style={{
          fontSize: 12,
          ...style,
        }}
      >
        {t('share.sharedBy', { name: sharedBy })}
      </Tag>
    );
  }

  return null;
});

export default SharedBadge;
