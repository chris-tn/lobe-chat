'use client';

import { ActionIcon } from '@lobehub/ui';
import { AlignJustify } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { DESKTOP_HEADER_ICON_SIZE, MOBILE_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useOpenChatSettings } from '@/hooks/useInterceptingRoutes';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useChatGroupStore } from '@/store/chatGroup';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';
import { HotkeyEnum } from '@/types/hotkey';

const AgentSettings = dynamic(() => import('./AgentSettings'), {
  ssr: false,
});

const AgentTeamSettings = dynamic(() => import('./AgentTeamSettings'), {
  ssr: false,
});

const SettingButton = memo<{ mobile?: boolean }>(({ mobile }) => {
  const hotkey = useUserStore(settingsSelectors.getHotkeyById(HotkeyEnum.OpenChatSettings));
  const { t } = useTranslation(['common', 'chat']);
  const isAdmin = useIsAdmin();
  const id = useSessionStore((s) => s.activeId);
  const isGroupSession = useSessionStore(sessionSelectors.isCurrentSessionGroupSession);

  // The chat settings need some compatibility so we use a hook but for
  // the group settings we use a store directly
  const openChatSettings = useOpenChatSettings();
  const openGroupSettings = useChatGroupStore((s) => s.toggleGroupSetting);

  const handleClick = () => {
    if (!isAdmin) return;

    if (isGroupSession) {
      openGroupSettings(true);
    } else {
      openChatSettings();
    }
  };

  return (
    <>
      <ActionIcon
        disabled={!isAdmin}
        icon={AlignJustify}
        onClick={handleClick}
        size={mobile ? MOBILE_HEADER_ICON_SIZE : DESKTOP_HEADER_ICON_SIZE}
        title={
          !isAdmin
            ? t('onlyAdminCanCreate', { ns: 'chat' })
            : t('openChatSettings.title', { ns: 'hotkey' })
        }
        tooltipProps={{
          hotkey: isAdmin ? hotkey : undefined,
          placement: 'bottom',
        }}
      />

      {isGroupSession ? <AgentTeamSettings key={id} /> : <AgentSettings key={id} />}
    </>
  );
});

export default SettingButton;
