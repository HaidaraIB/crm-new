import React from 'react';

import { translations } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { withLatinDigits } from '../../utils/dateUtils';
import { ChatBlobMedia } from '../chat/ChatBlobMedia';
import { CheckIcon } from '../icons';
import { PhoneText, isPhoneLike } from '../PhoneText';
import type { SupportChatMessage } from '../../services/api';

const CHAT_BUBBLE_PLAINTEXT_CLASS = '[unicode-bidi:plaintext]';

function supportQuoteLabel(
  kind: string | null | undefined,
  body: string,
  t: (key: keyof typeof translations.en) => string
): string {
  const cap = (body || '').trim();
  let label = '';
  if (kind === 'image') label = t('teamChatMediaPhoto');
  else if (kind === 'video') label = t('teamChatMediaVideo');
  else if (kind === 'audio') label = t('teamChatMediaAudio');
  else if (kind === 'document') label = t('teamChatMediaDocument');
  if (label && cap) return `${label}: ${cap}`;
  if (cap) return cap;
  return label;
}

function formatBubbleTime(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleString(
      language === 'ar' ? 'ar' : undefined,
      withLatinDigits({ hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return '';
  }
}

type Props = {
  message: SupportChatMessage;
  t: (key: keyof typeof translations.en) => string;
  compact?: boolean;
  onOpenMedia?: (message: SupportChatMessage) => void;
};

export const SupportMessageBubble: React.FC<Props> = ({ message, t, compact, onOpenMedia }) => {
  const { language } = useAppContext();
  if (message.side === 'system') {
    return (
      <div className="flex justify-center px-2">
        <p
          dir="auto"
          className={`max-w-md rounded-xl bg-gray-200/80 px-3 py-2 text-center text-xs text-gray-700 dark:bg-gray-700/80 dark:text-gray-200 ${CHAT_BUBBLE_PLAINTEXT_CLASS}`}
        >
          {message.body}
        </p>
      </div>
    );
  }
  const mine = message.is_mine;
  const label = message.display_name;
  const body = (message.body || '').trim();
  const timeLabel = formatBubbleTime(message.created_at, language);

  const attachmentKind = message.attachment_kind;
  const attachmentUrl = message.attachment_url;
  const hasVisualMedia =
    attachmentUrl && attachmentKind && (attachmentKind === 'image' || attachmentKind === 'video');

  const renderBody = () => {
    if (!body) return null;
    if (isPhoneLike(body)) {
      return <PhoneText className="whitespace-pre-wrap break-words text-sm">{body}</PhoneText>;
    }
    return (
      <p
        dir="auto"
        className={`whitespace-pre-wrap break-words text-sm ${CHAT_BUBBLE_PLAINTEXT_CLASS}`}
      >
        {body}
      </p>
    );
  };

  /** Widget media: fixed band so the 4:3 frame never collapses to caption width. */
  const bubbleMaxClass = hasVisualMedia
    ? compact
      ? 'w-full max-w-[19rem] min-w-[14rem] shrink-0'
      : 'max-w-[min(100%,22rem)]'
    : compact
      ? 'max-w-[min(100%,18rem)]'
      : 'max-w-[min(100%,20rem)]';

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${bubbleMaxClass} rounded-2xl px-3 py-2 shadow-sm border ${
          mine
            ? 'bg-primary text-white border-primary/30 rounded-br-md'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-bl-md'
        }`}
      >
        {!mine && label ? (
          <p
            dir="auto"
            className={`text-xs font-semibold mb-1 opacity-80 ${CHAT_BUBBLE_PLAINTEXT_CLASS}`}
          >
            {label}
          </p>
        ) : null}
        {message.reply_to ? (
          <div
            className={`mb-2 rounded-lg border-s-2 ps-2 text-xs opacity-90 ${
              mine ? 'border-white/60' : 'border-primary/50'
            }`}
          >
            <span dir="auto" className={`font-medium ${CHAT_BUBBLE_PLAINTEXT_CLASS}`}>
              {message.reply_to.display_name}
            </span>
            <p dir="auto" className={`truncate ${CHAT_BUBBLE_PLAINTEXT_CLASS}`}>
              {supportQuoteLabel(message.reply_to.attachment_kind, message.reply_to.body, t)}
            </p>
          </div>
        ) : null}
        {attachmentUrl && attachmentKind ? (
          <div
            className={
              attachmentKind === 'document'
                ? 'mb-1 w-[min(70vw,16rem)] max-w-full'
                : hasVisualMedia
                  ? 'mb-1 w-full min-w-0'
                  : 'w-full min-w-0'
            }
          >
            <ChatBlobMedia
              url={attachmentUrl}
              kind={attachmentKind as 'image' | 'video' | 'audio' | 'document'}
              mine={mine}
              filename={message.original_filename}
              attachmentWidth={message.attachment_width}
              attachmentHeight={message.attachment_height}
              t={t}
              visualScale={hasVisualMedia ? 'medium' : 'default'}
              onOpen={
                hasVisualMedia && onOpenMedia
                  ? () => onOpenMedia(message)
                  : undefined
              }
            />
          </div>
        ) : null}
        {renderBody()}
        <div
          dir="ltr"
          className={`mt-1.5 flex items-center gap-1.5 tabular-nums ${
            mine ? 'justify-end text-white/75' : 'justify-start text-gray-400 dark:text-gray-500'
          }`}
        >
          {timeLabel ? <span className="text-[10px]">{timeLabel}</span> : null}
          {mine ? (
            <span
              className={`inline-flex shrink-0 items-center ${
                message.read_by_peer ? 'text-sky-200' : 'text-white/60'
              }`}
              title={message.read_by_peer ? t('teamChatRead') : t('teamChatDelivered')}
              aria-label={message.read_by_peer ? t('teamChatRead') : t('teamChatDelivered')}
            >
              {message.read_by_peer ? (
                <>
                  <CheckIcon className="size-3.5" aria-hidden />
                  <CheckIcon className="size-3.5 -ms-2" aria-hidden />
                </>
              ) : (
                <CheckIcon className="size-3.5" aria-hidden />
              )}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
