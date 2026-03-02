'use client';

import { ActionIcon } from '@lobehub/ui';
import { AlignJustify } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { DESKTOP_HEADER_ICON_SIZE, MOBILE_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useOpenChatSettings } from '@/hooks/useInterceptingRoutes';
import dynamic from '@/libs/next/dynamic';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useChatGroupStore } from '@/store/chatGroup';
import { useSessionStore } from '@/store/session';
import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';
import { HotkeyEnum } from '@/types/hotkey';

const AgentSettingsEditor = dynamic(() => import('@/app/[variants]/(main)/agent/profile'), {
  ssr: false,
});

const SettingButton = memo<{ mobile?: boolean }>(({ mobile }) => {
  const hotkey = useUserStore(settingsSelectors.getHotkeyById(HotkeyEnum.OpenChatSettings));
  const { t } = useTranslation(['common', 'chat']);
  const isAdmin = useIsAdmin();
  const id = useSessionStore((s) => s.activeId);

  const openChatSettings = useOpenChatSettings();

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
        onClick={() => openChatSettings()}
      />

      <AgentSettingsEditor key={id} />
    </>
  );
});

export default SettingButton;
