'use client';

import { Button, Form, Input, Select } from '@lobehub/ui';
import { Input as AntdInput, Modal, Switch } from 'antd';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';

import { message } from '@/components/AntdStaticMethods';
import { integrationService } from '@/services/integration';
import { knowledgeBaseService } from '@/services/knowledgeBase';

interface CreateIntegrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
}

const CreateIntegrationModal = memo<CreateIntegrationModalProps>(({ open, onClose, onSuccess }) => {
  const { t } = useTranslation('knowledgeBase');
  const [loading, setLoading] = useState(false);

  const { data: knowledgeBases } = useSWR('knowledgeBases', () =>
    knowledgeBaseService.getKnowledgeBaseList(),
  );

  const onFinish = async (values: any) => {
    setLoading(true);

    try {
      await integrationService.createIntegration({
        config: {
          folderPath: values.folderPath || '/',
          password: values.password,
          url: values.url,
          username: values.username,
        },
        description: values.description,
        knowledgeBaseId: values.knowledgeBaseId,
        name: values.name,
        syncEnabled: values.syncEnabled ?? true,
        syncInterval: values.syncInterval ? parseInt(values.syncInterval) : 3600,
        type: 'nextcloud',
      });
      message.success('Integration created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error?.message || 'Failed to create integration');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      footer={null}
      onCancel={onClose}
      open={open}
      title={t('integration.create.title')}
      width={600}
    >
      <Form
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button htmlType={'submit'} loading={loading} type={'primary'}>
              {t('integration.create.create')}
            </Button>
          </div>
        }
        gap={16}
        items={[
          {
            children: (
              <Select
                options={knowledgeBases?.map((kb) => ({
                  label: kb.name,
                  value: kb.id,
                }))}
                placeholder={t('integration.create.knowledgeBase.placeholder')}
              />
            ),
            label: t('integration.create.knowledgeBase.label'),
            name: 'knowledgeBaseId',
            rules: [{ message: t('integration.create.knowledgeBase.required'), required: true }],
          },
          {
            children: <Input placeholder={t('integration.create.name.placeholder')} />,
            label: t('integration.create.name.label'),
            name: 'name',
            rules: [{ message: t('integration.create.name.required'), required: true }],
          },
          {
            children: (
              <AntdInput.TextArea placeholder={t('integration.create.description.placeholder')} />
            ),
            label: t('integration.create.description.label'),
            name: 'description',
          },
          {
            children: <Input placeholder={t('integration.create.nextcloud.url.placeholder')} />,
            label: t('integration.create.nextcloud.url.label'),
            name: 'url',
            rules: [
              { message: t('integration.create.nextcloud.url.required'), required: true },
              { message: 'Please enter a valid URL', type: 'url' },
            ],
          },
          {
            children: (
              <Input placeholder={t('integration.create.nextcloud.username.placeholder')} />
            ),
            label: t('integration.create.nextcloud.username.label'),
            name: 'username',
            rules: [
              { message: t('integration.create.nextcloud.username.required'), required: true },
            ],
          },
          {
            children: (
              <AntdInput.Password
                placeholder={t('integration.create.nextcloud.password.placeholder')}
              />
            ),
            label: t('integration.create.nextcloud.password.label'),
            name: 'password',
            rules: [
              { message: t('integration.create.nextcloud.password.required'), required: true },
            ],
          },
          {
            children: (
              <Input placeholder={t('integration.create.nextcloud.folderPath.placeholder')} />
            ),
            label: t('integration.create.nextcloud.folderPath.label'),
            name: 'folderPath',
            rules: [
              { message: t('integration.create.nextcloud.folderPath.required'), required: true },
            ],
          },
          {
            children: <Switch />,
            label: t('integration.create.syncSettings.enabled.label'),
            name: 'syncEnabled',
            valuePropName: 'checked',
          },
          {
            children: (
              <Input
                placeholder={t('integration.create.syncSettings.interval.placeholder')}
                type="number"
              />
            ),
            desc: t('integration.create.syncSettings.interval.help'),
            label: t('integration.create.syncSettings.interval.label'),
            name: 'syncInterval',
          },
        ]}
        itemsType={'flat'}
        layout={'vertical'}
        onFinish={onFinish}
      />
    </Modal>
  );
});

CreateIntegrationModal.displayName = 'CreateIntegrationModal';

export default CreateIntegrationModal;
