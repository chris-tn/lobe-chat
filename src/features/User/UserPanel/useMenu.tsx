import { LOBE_CHAT_CLOUD, UTM_SOURCE } from '@lobechat/business-const';
import { DOWNLOAD_URL, isDesktop } from '@lobechat/const';
import { Icon } from '@lobehub/ui';
import { type ItemType } from 'antd/es/menu/interface';
import { Cloudy, Download, HardDriveDownload, LogOut } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import useBusinessMenuItems from '@/business/client/features/User/useBusinessMenuItems';
import { type MenuProps } from '@/components/Menu';
import { OFFICIAL_URL } from '@/const/url';
import DataImporter from '@/features/DataImporter';
import { usePlatform } from '@/hooks/usePlatform';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useUserStore } from '@/store/user';
import { authSelectors } from '@/store/user/selectors';

export const useMenu = () => {
  const { t } = useTranslation(['common', 'setting', 'auth']);
  const { showCloudPromotion, hideDocs } = useServerConfigStore(featureFlagsSelectors);
  const [isLogin, isLoginWithAuth] = useUserStore((s) => [
    authSelectors.isLogin(s),
    authSelectors.isLoginWithAuth(s),
  ]);
  const businessMenuItems = useBusinessMenuItems(isLogin);
  const { isIOS, isAndroid } = usePlatform();

  const downloadUrl = useMemo(() => {
    if (isIOS) return DOWNLOAD_URL.ios;
    if (isAndroid) return DOWNLOAD_URL.android;
    return DOWNLOAD_URL.default;
  }, [isIOS, isAndroid]);

  // Hide settings menu for DxAi - users cannot configure settings
  const settings: MenuProps['items'] = [];

  const downloadClient: MenuProps['items'] = [
    {
      icon: <Icon icon={Download} />,
      key: 'download-client',
      label: (
        <a href={downloadUrl} rel="noopener noreferrer" target="_blank">
          {t('downloadClient')}
        </a>
      ),
    },
    {
      type: 'divider',
    },
  ];

  const data = !isLogin
    ? []
    : ([
        {
          icon: <Icon icon={HardDriveDownload} />,
          key: 'import',
          label: <DataImporter>{t('importData')}</DataImporter>,
        },
        {
          type: 'divider',
        },
      ].filter(Boolean) as ItemType[]);

  const helps: MenuProps['items'] = [
    showCloudPromotion && {
      icon: <Icon icon={Cloudy} />,
      key: 'cloud',
      label: (
        <a
          href={`${OFFICIAL_URL}?utm_source=${UTM_SOURCE}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          {t('userPanel.cloud', { name: LOBE_CHAT_CLOUD })}
        </a>
      ),
    },
  ].filter(Boolean) as ItemType[];

  const mainItems = [
    {
      type: 'divider',
    },

    ...(isLogin ? settings : []),
    ...businessMenuItems,
    ...(!isDesktop ? downloadClient : []),
    ...data,
    ...(!hideDocs ? helps : []),
  ].filter(Boolean) as MenuProps['items'];

  const logoutItems: MenuProps['items'] = isLoginWithAuth
    ? [
        {
          icon: <Icon icon={LogOut} />,
          key: 'logout',
          label: <span>{t('signout', { ns: 'auth' })}</span>,
        },
        {
          type: 'divider',
        },
      ]
    : [];

  return { logoutItems, mainItems };
};
