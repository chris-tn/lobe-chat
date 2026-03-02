'use client';

import { LOADING_FLAT } from '@lobechat/const';
import isEqual from 'fast-deep-equal';
import { type MouseEventHandler } from 'react';
import { memo, useCallback } from 'react';

import { MESSAGE_ACTION_BAR_PORTAL_ATTRIBUTES } from '@/const/messageActionPortal';
import { ChatItem } from '@/features/Conversation/ChatItem';
import { useNewScreen } from '@/features/Conversation/Messages/components/useNewScreen';

import ErrorMessageExtra, { useErrorContent } from '../../Error';
import { useAgentMeta, useDoubleClickEdit } from '../../hooks';
import { dataSelectors, messageStateSelectors, useConversationStore } from '../../store';
import { getMarkdownElements } from '../../MarkdownElements';
import { useEnableChartDisplay } from '@/hooks/useEnableChartDisplay';
import { useDoubleClickEdit } from '../../hooks/useDoubleClickEdit';
import { normalizeThinkTags, processWithArtifact } from '../../utils/markdown';
import MessageBranch from '../components/MessageBranch';
import {
  useSetMessageItemActionElementPortialContext,
  useSetMessageItemActionTypeContext,
} from '../Contexts/message-action-context';
import MessageContent from './components/MessageContent';
import { AssistantMessageExtra } from './Extra';

const actionBarHolder = (
  <div {...{ [MESSAGE_ACTION_BAR_PORTAL_ATTRIBUTES.assistant]: '' }} style={{ height: '28px' }} />
);
// Note: Plugins are created at module level, so they include all elements
// Feature flag check happens in component rendering
const getRehypePlugins = () =>
  getMarkdownElements()
    .map((element) => element.rehypePlugin)
    .filter(Boolean);
const getRemarkPlugins = () =>
  getMarkdownElements()
    .map((element) => element.remarkPlugin)
    .filter(Boolean);

interface AssistantMessageProps {
  disableEditing?: boolean;
  id: string;
  index: number;
  isLatestItem?: boolean;
}

const AssistantMessage = memo<AssistantMessageProps>(
  ({ id, index, disableEditing, isLatestItem }) => {
    // Get message and actionsConfig from ConversationStore
    const item = useConversationStore(dataSelectors.getDisplayMessageById(id), isEqual)!;

    const {
      agentId,
      branch,
      error,
      role,
      content,
      createdAt,
      tools,
      extra,
      model,
      provider,
      performance,
      usage,
      metadata,
    } = item;

    const avatar = useAgentMeta(agentId);

    // Get editing and generating state from ConversationStore
    const editing = useConversationStore(messageStateSelectors.isMessageEditing(id));
    const generating = useConversationStore(messageStateSelectors.isMessageGenerating(id));
    const creating = useConversationStore(messageStateSelectors.isMessageCreating(id));
    const { minHeight } = useNewScreen({
      creating: creating || generating,
      isLatestItem,
      messageId: id,
    });

    const errorContent = useErrorContent(error);

    // remove line breaks in artifact tag to make the ast transform easier
    const message = !editing ? normalizeThinkTags(processWithArtifact(content)) : content;

    const onDoubleClick = useDoubleClickEdit({ disableEditing, error, id, role });
    const setMessageItemActionElementPortialContext =
      useSetMessageItemActionElementPortialContext();
    const setMessageItemActionTypeContext = useSetMessageItemActionTypeContext();

    const onMouseEnter: MouseEventHandler<HTMLDivElement> = useCallback(
      (e) => {
        setMessageItemActionElementPortialContext(e.currentTarget);
        setMessageItemActionTypeContext({ id, index, type: 'assistant' });
      },
      [id, index, setMessageItemActionElementPortialContext, setMessageItemActionTypeContext],
    );
  const reducted =
    isGroupSession && targetId !== null && targetId !== 'user' && !groupConfig?.revealDM;

  // Get target name for DM indicator
  const userName = useUserStore(userProfileSelectors.nickName) || 'User';
  const agents = useSessionStore(sessionSelectors.currentGroupAgents);

  const dmIndicator = useMemo(() => {
    if (!targetId) return undefined;

    let targetName = targetId;
    if (targetId === 'user') {
      targetName = t('dm.you');
    } else {
      const targetAgent = agents?.find((agent) => agent.id === targetId);
      targetName = targetAgent?.title || targetId;
    }

    return <Tag>{t('dm.visibleTo', { target: targetName })}</Tag>;
  }, [targetId, userName, agents, t]);

  // ======================= Performance Optimization ======================= //
  // these useMemo/useCallback are all for the performance optimization
  // maybe we can remove it in React 19
  // ======================================================================== //

  const enableChartDisplay = useEnableChartDisplay();

  const components = useMemo(
    () =>
      Object.fromEntries(
        getMarkdownElements().map((element) => {
          const Component = element.Component;

          return [element.tag, (props: any) => <Component {...props} id={id} />];
        }),
      ),
    [id, enableChartDisplay],
  );

  const rehypePlugins = useMemo(() => getRehypePlugins(), [enableChartDisplay]);
  const remarkPlugins = useMemo(() => getRemarkPlugins(), [enableChartDisplay]);

  const markdownProps = useMemo(
    () => ({
      animated,
      citations: search?.citations,
      componentProps: {
        highlight: {
          actionsRender: ({ content, actionIconSize, language, originalNode }: any) => {
            const showHtmlPreview = isHtmlCode(content, language);

            return (
              <>
                {showHtmlPreview && <HtmlPreviewAction content={content} size={actionIconSize} />}
                {originalNode}
              </>
            );
          },
          theme: highlighterTheme,
        },
        mermaid: { theme: mermaidTheme },
      },
      components,
      enableCustomFootnotes: true,
      rehypePlugins,
      remarkPlugins,
      showFootnotes:
        search?.citations &&
        // if the citations are all empty, we should not show the citations
        search?.citations.length > 0 &&
        // if the citations's url and title are all the same, we should not show the citations
        search?.citations.every((item) => item.title !== item.url),
    }),
    [animated, components, role, search, highlighterTheme, mermaidTheme, rehypePlugins, remarkPlugins],
  );

    return (
      <ChatItem
        showTitle
        aboveMessage={null}
        avatar={avatar}
        customErrorRender={(error) => <ErrorMessageExtra data={item} error={error} />}
        editing={editing}
        id={id}
        loading={generating}
        message={message}
        newScreenMinHeight={minHeight}
        placement={'left'}
        time={createdAt}
        actions={
          <>
            {branch && (
              <MessageBranch
                activeBranchIndex={branch.activeBranchIndex}
                count={branch.count}
                messageId={id}
              />
            )}
            {actionBarHolder}
          </>
        }
        error={
          errorContent && error && (message === LOADING_FLAT || !message) ? errorContent : undefined
        }
        messageExtra={
          <AssistantMessageExtra
            content={content}
            extra={extra}
            id={id}
            model={model!}
            performance={performance! || metadata}
            provider={provider!}
            tools={tools}
            usage={usage! || metadata}
          />
        }
        onDoubleClick={onDoubleClick}
        onMouseEnter={onMouseEnter}
      >
        <MessageContent {...item} />
      </ChatItem>
    );
  },
  isEqual,
);

AssistantMessage.displayName = 'AssistantMessage';

export default AssistantMessage;
