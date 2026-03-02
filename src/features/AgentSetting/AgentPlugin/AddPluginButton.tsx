import { type ButtonProps } from '@lobehub/ui';
import { Button } from '@lobehub/ui';
import { Grid2x2Plus } from 'lucide-react';
import { type Ref } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import DevModal from '@/features/PluginDevModal';
import { useAgentStore } from '@/store/agent';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToolStore } from '@/store/tool';

const AddPluginButton = ({ ref, ...props }: ButtonProps & { ref?: Ref<HTMLButtonElement> }) => {
  const { t } = useTranslation('setting');
  const isAdmin = useIsAdmin();
  const [showModal, setModal] = useState(false);
  const toggleAgentPlugin = useAgentStore((s) => s.toggleAgentPlugin);
  const [installCustomPlugin, updateNewDevPlugin] = useToolStore((s) => [
    s.installCustomPlugin,
    s.updateNewCustomPlugin,
  ]);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <DevModal
        open={showModal}
        onOpenChange={setModal}
        onValueChange={updateNewDevPlugin}
        onSave={async (devPlugin) => {
          await installCustomPlugin(devPlugin);
          toggleAgentPlugin(devPlugin.identifier);
        }}
      />
      <Button
        icon={Grid2x2Plus}
        ref={ref}
        size={'small'}
        disabled={!isAdmin}
        icon={PackagePlus}
        onClick={() => {
          if (!isAdmin) return;
          setModal(true);
        }}
        ref={ref}
        size={'small'}
        title={!isAdmin ? t('onlyAdminCanCreate', { ns: 'chat' }) : undefined}
      >
        {t('plugin.addTooltip')}
      </Button>
    </div>
  );
};

export default AddPluginButton;
