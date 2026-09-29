import React, { useMemo, useState } from 'react';

import { SectionLoadingState } from '../SectionLoadingState';
import { ChatMediaViewer } from '../chat/ChatMediaViewer';
import { buildChatMediaAlbum, findChatMediaAlbumIndex, type ChatMediaAlbumItem } from '../chat/chatMediaAlbum';
import { useAppContext } from '../../context/AppContext';
import { useSupportChat } from '../../hooks/useSupportChat';
import type { SupportChatMessage } from '../../services/api';
import { SupportComposer } from './SupportComposer';
import { SupportMessageList } from './SupportMessageList';

type Props = {
  className?: string;
  enabled?: boolean;
  /** Full Support Center tab vs compact floating widget (header lives on the panel). */
  variant?: 'page' | 'widget';
};

const QUICK_KEYS = [
  'supportChatQuickBilling',
  'supportChatQuickTechnical',
  'supportChatQuickFeature',
] as const;

export const SupportChatThread: React.FC<Props> = ({
  className = '',
  enabled = true,
  variant = 'page',
}) => {
  const { t } = useAppContext();
  const isWidget = variant === 'widget';
  const {
    conversation,
    messages,
    hasOlder,
    olderLoading,
    loadOlder,
    isLoading,
    sendMutation,
  } = useSupportChat({ enabled });
  const [replyTo, setReplyTo] = useState<SupportChatMessage | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{
    items: ChatMediaAlbumItem[];
    index: number;
  } | null>(null);

  const mediaAlbum = useMemo(
    () =>
      buildChatMediaAlbum(
        messages.map((m) => ({
          id: m.id,
          kind: m.attachment_kind,
          url: m.attachment_url,
          filename: m.original_filename,
          width: m.attachment_width,
          height: m.attachment_height,
        }))
      ),
    [messages]
  );

  const openMediaForMessage = (message: SupportChatMessage) => {
    if (!message.attachment_url) return;
    if (message.attachment_kind !== 'image' && message.attachment_kind !== 'video') return;
    setMediaViewer({
      items: mediaAlbum,
      index: findChatMediaAlbumIndex(mediaAlbum, String(message.id)),
    });
  };

  const handleSend = async (payload: { body: string; file?: File }) => {
    const replyToMessageId = replyTo?.id;
    await sendMutation.mutateAsync({
      body: payload.body,
      file: payload.file,
      replyToMessageId,
    });
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col min-h-0 ${className}`}>
        <SectionLoadingState className="py-8" />
      </div>
    );
  }

  const empty = messages.length === 0;
  const status = conversation?.status;
  const composerDisabled = status === 'pending' || sendMutation.isPending;
  const composerPlaceholderKey =
    status === 'resolved' || status === undefined
      ? 'supportChatRequestPlaceholder'
      : 'supportChatSendPlaceholder';

  const shellClass = isWidget
    ? `flex flex-col min-h-0 flex-1 overflow-hidden ${className}`
    : `flex flex-col min-h-[24rem] max-h-[70vh] bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`;

  return (
    <div className={shellClass}>
      {!isWidget ? (
        <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('supportChatTitle')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('supportChatIntro')}</p>
          {status === 'resolved' ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t('supportChatResolvedNotice')}</p>
          ) : null}
          {status === 'pending' ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t('supportChatPendingNotice')}</p>
          ) : null}
        </header>
      ) : null}

      {isWidget && status === 'resolved' ? (
        <p className="shrink-0 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-800/50">
          {t('supportChatResolvedNotice')}
        </p>
      ) : null}
      {isWidget && status === 'pending' ? (
        <p className="shrink-0 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/50 dark:border-amber-800/50">
          {t('supportChatPendingNotice')}
        </p>
      ) : null}

      {empty ? (
        <div
          className={`flex-1 flex flex-col justify-center min-h-0 ${
            isWidget ? 'px-3 py-4 gap-2' : 'p-6 text-center gap-3 items-center'
          }`}
        >
          <p className={`font-medium text-gray-900 dark:text-gray-100 ${isWidget ? 'text-sm' : ''}`}>
            {t('supportChatEmptyTitle')}
          </p>
          <p className={`text-gray-500 dark:text-gray-400 ${isWidget ? 'text-xs' : 'text-sm'}`}>
            {t('supportChatEmptyHint')}
          </p>
          <div
            className={`flex gap-1.5 ${isWidget ? 'flex-col mt-1' : 'flex-wrap justify-center'}`}
          >
            {QUICK_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`text-left rounded-lg border transition-colors ${
                  isWidget
                    ? 'text-xs px-2.5 py-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
                    : 'text-xs px-3 py-1.5 rounded-full border-primary/40 text-primary dark:border-violet-400/50 dark:text-violet-200 hover:bg-primary/10 dark:hover:bg-violet-500/15'
                }`}
                onClick={() => void sendMutation.mutateAsync({ body: t(key) })}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <SupportMessageList
          messages={messages}
          t={t}
          hasOlder={hasOlder}
          olderLoading={olderLoading}
          onLoadOlder={() => void loadOlder()}
          onReply={setReplyTo}
          compact={isWidget}
          onOpenMedia={openMediaForMessage}
          showJumpToLatest={showJumpToLatest}
          onJumpToLatest={() => setShowJumpToLatest(false)}
          onNearBottomChange={(near) => setShowJumpToLatest(!near)}
          replyOpen={replyTo != null}
        />
      )}

      {mediaViewer ? (
        <ChatMediaViewer
          items={mediaViewer.items}
          initialIndex={mediaViewer.index}
          onClose={() => setMediaViewer(null)}
          t={t as (key: keyof typeof import('../../constants').translations.en) => string}
        />
      ) : null}

      <SupportComposer
        t={t as (key: keyof typeof import('../../constants').translations.en) => string}
        disabled={composerDisabled}
        placeholderKey={composerPlaceholderKey}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        onOpenPending={(file, previewUrl, kind) =>
          setMediaViewer({
            items: [
              {
                id: 'pending-attachment',
                kind,
                url: previewUrl,
                filename: file.name,
              },
            ],
            index: 0,
          })
        }
        compact={isWidget}
      />
    </div>
  );
};
