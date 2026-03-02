import { ActionIcon, Dropdown, EditableText, Icon, type MenuProps, Text } from '@lobehub/ui';
import { App } from 'antd';
import { createStyles } from 'antd-style';
import { LucideLoader2, MoreVertical, PencilLine, Trash } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import BubblesLoading from '@/components/BubblesLoading';
import RepoIcon from '@/components/RepoIcon';
import { LOADING_FLAT } from '@/const/message';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useKnowledgeBaseStore } from '@/store/knowledgeBase';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/slices/auth/selectors';

export const knowledgeItemClass = 'knowledge-base-item';

const useStyles = createStyles(({ css }) => ({
  content: css`
    position: relative;
    overflow: hidden;
    flex: 1;
  `,
  icon: css`
    min-width: 24px;
    border-radius: 4px;
  `,
  title: css`
    flex: 1;
    height: 28px;
    line-height: 28px;
    text-align: start;
  `,
}));

interface KnowledgeBaseItemProps {
  id: string;
  name: string;
  showMore: boolean;
}

const Content = memo<KnowledgeBaseItemProps>(({ id, name, showMore }) => {
  const { t } = useTranslation(['file', 'common']);
  const isAdmin = useIsAdmin();
  const currentUserId = useUserStore(userProfileSelectors.userId);
  const { useFetchKnowledgeBaseItem } = useKnowledgeBaseStore();
  const { data: knowledgeBaseItem } = useFetchKnowledgeBaseItem(id);

  const [editing, updateKnowledgeBase, removeKnowledgeBase, isLoading] = useKnowledgeBaseStore(
    (s) => [
      s.knowledgeBaseRenamingId === id,
      s.updateKnowledgeBase,
      s.removeKnowledgeBase,
      s.knowledgeBaseLoadingIds.includes(id),
    ],
  );

  // Check if user is the owner of the knowledge base
  // Only owners can delete (backend enforces this, but we hide the option for shared KBs)
  const isOwner =
    isAdmin || (knowledgeBaseItem && (knowledgeBaseItem as any).userId === currentUserId);

  const { styles } = useStyles();

  const toggleEditing = (visible?: boolean) => {
    useKnowledgeBaseStore.setState(
      { knowledgeBaseRenamingId: visible ? id : null },
      false,
      'toggleEditing',
    );
  };

  const { modal } = App.useApp();

  const items = useMemo<MenuProps['items']>(() => {
    const menuItems: MenuProps['items'] = [
      {
        icon: <Icon icon={PencilLine} />,
        key: 'rename',
        label: t('rename', { ns: 'common' }),
        onClick: ({ domEvent }: any) => {
          domEvent.stopPropagation();
          toggleEditing(true);
        },
      },
    ];

    // Only show delete option if user is the owner
    if (isOwner) {
      menuItems.push(
        {
          type: 'divider' as const,
        },
        {
          danger: true,
          icon: <Icon icon={Trash} />,
          key: 'delete',
          label: t('delete', { ns: 'common' }),
          onClick: ({ domEvent }: any) => {
            if (!id) return;

            domEvent.stopPropagation();
            modal.confirm({
              centered: true,
              okButtonProps: { danger: true },
              onOk: async () => {
                await removeKnowledgeBase(id);
              },
              title: t('knowledgeBase.list.confirmRemoveKnowledgeBase'),
            });
          },
        },
      );
    }

    return menuItems;
  }, [t, id, modal, removeKnowledgeBase, isOwner]);

  return (
    <Flexbox
      align={'center'}
      gap={8}
      horizontal
      justify={'space-between'}
      onDoubleClick={(e) => {
        if (!id) return;
        if (e.altKey) toggleEditing(true);
      }}
    >
      <Center className={isLoading ? '' : styles.icon} height={24} width={24}>
        {isLoading ? <Icon icon={LucideLoader2} spin /> : <RepoIcon />}
      </Center>
      {!editing ? (
        name === LOADING_FLAT ? (
          <Flexbox flex={1} height={28} justify={'center'}>
            <BubblesLoading />
          </Flexbox>
        ) : (
          <Text
            className={styles.title}
            ellipsis={{ rows: 1, tooltip: { placement: 'left', title: name } }}
            style={{ margin: 0, opacity: isLoading ? 0.6 : undefined }}
          >
            {name}
          </Text>
        )
      ) : (
        <EditableText
          editing={editing}
          inputProps={{
            autoFocus: true,
            maxLength: 64,
          }}
          onChangeEnd={(v) => {
            if (name !== v) {
              updateKnowledgeBase(id, { name: v });
            }
            toggleEditing(false);
          }}
          onClick={(e) => {
            e.preventDefault();
          }}
          onEditingChange={toggleEditing}
          showEditIcon={false}
          style={{ height: 28 }}
          value={name}
        />
      )}

      {showMore && !editing && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Dropdown
            arrow={false}
            menu={{
              items: items,
              onClick: ({ domEvent }) => {
                domEvent.stopPropagation();
              },
            }}
            trigger={['click']}
          >
            <ActionIcon className={knowledgeItemClass} icon={MoreVertical} size={'small'} />
          </Dropdown>
        </div>
      )}
    </Flexbox>
  );
});

Content.displayName = 'KnowledgeBaseItemContent';

export default Content;
