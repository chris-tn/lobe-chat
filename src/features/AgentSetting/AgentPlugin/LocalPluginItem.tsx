import { Switch } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useToolStore } from '@/store/tool';

import { useStore } from '../store';

const MarketList = memo<{ disabled?: boolean, id: string; }>(({ id, disabled = false }) => {
  const [toggleAgentPlugin, hasPlugin] = useStore((s) => [s.toggleAgentPlugin, !!s.config.plugins]);
  const plugins = useStore((s) => s.config.plugins || []);

  const [useFetchPluginList, fetchPluginManifest] = useToolStore((s) => [
    s.useFetchPluginStore,
    s.installPlugin,
  ]);

  const pluginManifestLoading = useToolStore((s) => s.pluginInstallLoading, isEqual);

  useFetchPluginList();

  return (
    <Flexbox align={'center'} gap={8} horizontal>
      <Switch
        checked={
          // 如果在加载中，说明激活了
          pluginManifestLoading[id] || !hasPlugin ? false : plugins.includes(id)
        }
        disabled={disabled}
        loading={pluginManifestLoading[id]}
        onChange={(checked) => {
          if (disabled) return;
          toggleAgentPlugin(id);
          if (checked) {
            fetchPluginManifest(id);
          }
        }}
      />
    </Flexbox>
  );
});

export default MarketList;
