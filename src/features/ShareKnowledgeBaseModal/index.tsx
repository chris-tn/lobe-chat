import { ActionIcon } from '@lobehub/ui';
import { App, Divider, List, Modal, Select, Switch, Tag } from 'antd';
import { Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { lambdaClient } from '@/libs/trpc/client';

interface ShareKnowledgeBaseModalProps {
  knowledgeBaseId: string;
  onClose?: () => void;
  onSuccess?: () => void;
  open: boolean;
}

interface UserOption {
  avatar?: string | null;
  email: string;
  fullName: string;
  id: string;
}

interface ExistingShare {
  id: string;
  isGlobal: boolean;
  sharedWithUserId: string | null;
  userEmail: string | null;
  userFullName: string | null;
}

const ShareKnowledgeBaseModal = memo<ShareKnowledgeBaseModalProps>(
  ({ open, onClose, onSuccess, knowledgeBaseId }) => {
    const { t } = useTranslation('chat');
    const { message } = App.useApp();
    const [isGlobal, setIsGlobal] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [usersData, setUsersData] = useState<UserOption[]>([]);
    const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);

    // Fetch existing shares
    useEffect(() => {
      if (!open) return;

      setLoadingShares(true);
      lambdaClient.knowledgeBase.getKnowledgeBaseShareList
        .query({ knowledgeBaseId })
        .then((shares) => setExistingShares(shares as ExistingShare[]))
        .catch((error) => {
          console.error('Failed to fetch existing shares:', error);
        })
        .finally(() => setLoadingShares(false));
    }, [open, knowledgeBaseId]);

    // Fetch user list when modal opens
    useEffect(() => {
      if (!open) return;

      lambdaClient.user.getUserList
        .query()
        .then((users) => setUsersData(users))
        .catch((error) => {
          console.error('Failed to fetch users:', error);
          message.error(t('share.failed'));
        });
    }, [open]);

    const handleUnshare = async (userId: string) => {
      try {
        await lambdaClient.knowledgeBase.unshareKnowledgeBase.mutate({
          knowledgeBaseId,
          targetUserIds: [userId],
        });
        message.success(t('share.unshareSuccess'));

        // Refresh shares list
        const shares = await lambdaClient.knowledgeBase.getKnowledgeBaseShareList.query({
          knowledgeBaseId,
        });
        setExistingShares(shares as ExistingShare[]);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to unshare:', error);
        message.error(t('share.failed'));
      }
    };

    const handleUnshareGlobal = async () => {
      try {
        await lambdaClient.knowledgeBase.unshareGlobalKnowledgeBase.mutate({ knowledgeBaseId });
        message.success(t('share.unshareGlobalSuccess'));

        // Refresh shares list
        const shares = await lambdaClient.knowledgeBase.getKnowledgeBaseShareList.query({
          knowledgeBaseId,
        });
        setExistingShares(shares as ExistingShare[]);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to unshare global:', error);
        message.error(t('share.failed'));
      }
    };

    const handleOk = async () => {
      try {
        setLoading(true);

        if (isGlobal) {
          await lambdaClient.knowledgeBase.shareGlobalKnowledgeBase.mutate({
            knowledgeBaseId,
          });
          message.success(t('share.globalSuccess'));
        } else if (selectedUsers.length > 0) {
          await lambdaClient.knowledgeBase.shareKnowledgeBase.mutate({
            knowledgeBaseId,
            targetUserIds: selectedUsers,
          });
          message.success(t('share.success'));
        }

        // Refresh shares list
        const shares = await lambdaClient.knowledgeBase.getKnowledgeBaseShareList.query({
          knowledgeBaseId,
        });
        setExistingShares(shares as ExistingShare[]);

        setSelectedUsers([]);
        setIsGlobal(false);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to share knowledge base:', error);
        message.error(t('share.failed'));
      } finally {
        setLoading(false);
      }
    };

    const handleCancel = () => {
      setSelectedUsers([]);
      setIsGlobal(false);
      onClose?.();
    };

    const globalShare = existingShares.find((s) => s.isGlobal);
    const userShares = existingShares.filter((s) => !s.isGlobal);

    // Filter out already shared users from selection
    const sharedUserIds = new Set(userShares.map((s) => s.sharedWithUserId));
    const availableUsers = usersData
      .filter((u) => !sharedUserIds.has(u.id))
      .map((user) => ({
        label: `${user.fullName} (${user.email})`,
        value: user.id,
      }));

    return (
      <Modal
        okButtonProps={{
          disabled: !isGlobal && selectedUsers.length === 0,
          loading,
        }}
        okText={t('share.add')}
        onCancel={handleCancel}
        onOk={handleOk}
        open={open}
        title={t('share.title')}
        width={600}
      >
        <Flexbox gap={16} paddingBlock={16}>
          {/* Existing Shares Section */}
          {!loadingShares && (globalShare || userShares.length > 0) && (
            <>
              <Flexbox gap={12}>
                <span style={{ fontWeight: 500 }}>{t('share.currentShares')}</span>

                {globalShare && (
                  <Flexbox
                    gap={8}
                    horizontal
                    justify="space-between"
                    style={{
                      background: 'rgba(0,0,0,0.1)',
                      borderRadius: 8,
                      padding: '8px 12px',
                    }}
                  >
                    <Flexbox gap={4} horizontal>
                      <Tag color="blue">{t('share.globalTag')}</Tag>
                      <span>{t('share.sharedWithEveryone')}</span>
                    </Flexbox>
                    <ActionIcon
                      icon={Trash2}
                      onClick={handleUnshareGlobal}
                      size="small"
                      title={t('share.unshare')}
                    />
                  </Flexbox>
                )}

                {userShares.length > 0 && (
                  <List
                    dataSource={userShares}
                    renderItem={(share) => (
                      <List.Item
                        actions={[
                          <ActionIcon
                            icon={Trash2}
                            key="delete"
                            onClick={() => handleUnshare(share.sharedWithUserId!)}
                            size="small"
                            title={t('share.unshare')}
                          />,
                        ]}
                      >
                        <List.Item.Meta
                          description={share.userEmail}
                          title={share.userFullName || share.userEmail}
                        />
                      </List.Item>
                    )}
                    size="small"
                    style={{ maxHeight: 200, overflowY: 'auto' }}
                  />
                )}
              </Flexbox>
              <Divider style={{ margin: 0 }} />
            </>
          )}

          {/* Add New Shares Section */}
          <Flexbox gap={12}>
            <span style={{ fontWeight: 500 }}>{t('share.addNewShares')}</span>

            <Flexbox gap={8} horizontal justify={'space-between'}>
              <span>{t('share.sharedGlobal')}</span>
              <Switch checked={isGlobal} disabled={!!globalShare} onChange={setIsGlobal} />
            </Flexbox>

            {!isGlobal && (
              <Flexbox gap={8}>
                <span>{t('share.selectUsers')}</span>
                <Select
                  disabled={availableUsers.length === 0}
                  loading={usersData.length === 0}
                  mode="multiple"
                  onChange={setSelectedUsers}
                  options={availableUsers}
                  placeholder={
                    availableUsers.length === 0
                      ? t('share.allUsersShared')
                      : t('share.selectUsersPlaceholder')
                  }
                  style={{ width: '100%' }}
                  value={selectedUsers}
                />
              </Flexbox>
            )}
          </Flexbox>
        </Flexbox>
      </Modal>
    );
  },
);

ShareKnowledgeBaseModal.displayName = 'ShareKnowledgeBaseModal';

export default ShareKnowledgeBaseModal;
