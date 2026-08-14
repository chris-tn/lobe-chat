'use client';

import { ActionIcon, Modal, type ModalProps, Select } from '@lobehub/ui';
import { App, Divider, List, Switch, Tag } from 'antd';
import { Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from '@lobehub/ui';

import { lambdaClient } from '@/libs/trpc/client';
import { agentSharingService } from '@/services/agentSharing';

interface ShareAgentModalProps extends ModalProps {
  agentTitle?: string;
  onSuccess?: () => void;
  sessionId: string;
}

interface UserOption {
  avatar?: string | null;
  email: string;
  fullName: string;
  id: string;
}

interface ExistingShare {
  agentId: string;
  id: string;
  isGlobal: boolean;
  sharedWithUserId: string | null;
  userEmail: string | null;
  userFullName: string | null;
}

const ShareAgentModal = memo<ShareAgentModalProps>(
  ({ sessionId, agentTitle, open, onCancel, onSuccess }) => {
    const { t } = useTranslation('chat');
    const { message } = App.useApp();

    const [loading, setLoading] = useState(false);
    const [isGlobal, setIsGlobal] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [isLoadingAgent, setIsLoadingAgent] = useState(false);
    const [usersData, setUsersData] = useState<UserOption[]>([]);
    const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);

    // Fetch agent ID from session ID
    useEffect(() => {
      if (!open) return;

      setIsLoadingAgent(true);
      lambdaClient.agent.getAgentIdBySessionId
        .query({ sessionId })
        .then((id) => setAgentId(id))
        .catch((error) => {
          console.error('Failed to fetch agent ID:', error);
          message.error(t('share.failed'));
        })
        .finally(() => setIsLoadingAgent(false));
    }, [open, sessionId]);

    // Fetch existing shares
    useEffect(() => {
      if (!open || !agentId) return;

      setLoadingShares(true);
      lambdaClient.agentSharing.getAgentShareList
        .query({ agentId })
        .then((shares) => setExistingShares(shares as ExistingShare[]))
        .catch((error) => {
          console.error('Failed to fetch existing shares:', error);
        })
        .finally(() => setLoadingShares(false));
    }, [open, agentId]);

    // Fetch available users list from API
    useEffect(() => {
      if (!open) return;

      lambdaClient.user.getUserList
        .query()
        .then((users) => setUsersData(users))
        .catch((error) => {
          console.error('Failed to fetch users:', error);
        });
    }, [open]);

    const handleUnshare = async (userId: string) => {
      if (!agentId) return;

      try {
        await lambdaClient.agentSharing.unshareAgent.mutate({
          agentId,
          userId,
        });
        message.success(t('share.unshareSuccess'));

        // Refresh shares list
        const shares = await lambdaClient.agentSharing.getAgentShareList.query({ agentId });
        setExistingShares(shares as ExistingShare[]);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to unshare:', error);
        message.error(t('share.failed'));
      }
    };

    const handleUnshareGlobal = async () => {
      if (!agentId) return;

      try {
        await lambdaClient.agentSharing.unshareGlobalAgent.mutate({ agentId });
        message.success(t('share.unshareGlobalSuccess'));

        // Refresh shares list
        const shares = await lambdaClient.agentSharing.getAgentShareList.query({ agentId });
        setExistingShares(shares as ExistingShare[]);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to unshare global:', error);
        message.error(t('share.failed'));
      }
    };

    const handleShare = async () => {
      if (!agentId) {
        message.error(t('share.failed'));
        return;
      }

      if (!isGlobal && selectedUsers.length === 0) {
        message.warning(t('share.selectUsers'));
        return;
      }

      try {
        setLoading(true);

        if (isGlobal) {
          await agentSharingService.shareGlobalAgent(agentId);
          message.success(t('share.globalSuccess'));
        } else {
          await agentSharingService.shareAgent(agentId, selectedUsers);
          message.success(t('share.success', { count: selectedUsers.length }));
        }

        // Refresh shares list
        const shares = await lambdaClient.agentSharing.getAgentShareList.query({ agentId });
        setExistingShares(shares as ExistingShare[]);

        setSelectedUsers([]);
        setIsGlobal(false);
        onSuccess?.();
      } catch (error) {
        console.error('Failed to share agent:', error);
        message.error(t('share.failed'));
      } finally {
        setLoading(false);
      }
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
        allowFullscreen
        destroyOnHidden
        okButtonProps={{ disabled: !agentId, loading: loading || isLoadingAgent || !agentId }}
        okText={t('share.add')}
        onCancel={(e) => {
          setSelectedUsers([]);
          setIsGlobal(false);
          onCancel?.(e);
        }}
        onOk={handleShare}
        open={open}
        title={t('share.title', { title: agentTitle || t('newAgent') })}
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

            <Flexbox gap={8}>
              <Flexbox horizontal justify="space-between">
                <span>{t('share.globalShare')}</span>
                <Switch checked={isGlobal} disabled={!!globalShare} onChange={setIsGlobal} />
              </Flexbox>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                {t('share.globalShareDesc')}
              </span>
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

export default ShareAgentModal;
