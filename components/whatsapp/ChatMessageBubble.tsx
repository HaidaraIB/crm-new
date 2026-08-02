import React from 'react';
import { ChatBlobMedia } from '../chat/ChatBlobMedia';
import { WhatsAppFormattedText } from '../../utils/whatsappFormatting';
import { WA_BUBBLE_IN, WA_BUBBLE_OUT, WA_BUBBLE_OUT_FAILED, WA_TICK_READ } from './whatsappChatTheme';

export type ChatBubbleMessage = {
  id: string;
  body: string;
  direction: 'in' | 'out';
  time: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveryError?: string;
  createdByUsername?: string | null;
  apiId?: number;
  attachmentKind?: 'image' | 'video' | 'audio' | 'document' | null;
  attachmentUrl?: string | null;
  attachmentFilename?: string | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  isVoiceNote?: boolean;
};

const AUTO_DIR_CLASS = '[unicode-bidi:plaintext]';

/** Telegram-style separate double ticks (two offset strokes, not a fused ✓✓ glyph). */
function DeliveryTicks({
  status,
}: {
  status: 'sent' | 'delivered' | 'read';
}) {
  const isRead = status === 'read';
  const single = status === 'sent';
  return (
    <span
      className={`inline-flex shrink-0 items-center ${isRead ? WA_TICK_READ : 'opacity-55'}`}
      aria-hidden
    >
      <svg width={single ? 11 : 16} height="11" viewBox={single ? '0 0 11 11' : '0 0 16 11'} fill="none">
        {single ? (
          <path
            d="M1.5 5.8 L4.2 8.4 L9.5 2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <path
              d="M1.2 5.8 L3.9 8.4 L8.8 2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.2 5.8 L8.9 8.4 L14.8 2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </span>
  );
}

type Props = {
  msg: ChatBubbleMessage;
  t: (key: string) => string;
  onDelete?: (msg: ChatBubbleMessage) => void;
  onResend?: (msg: ChatBubbleMessage) => void;
  deleting?: boolean;
  resending?: boolean;
};

export const ChatMessageBubble: React.FC<Props> = ({
  msg,
  t,
  onDelete,
  onResend,
  deleting,
  resending,
}) => {
  const isOut = msg.direction === 'out';
  const bubbleClass = isOut
    ? msg.status === 'failed'
      ? WA_BUBBLE_OUT_FAILED
      : WA_BUBBLE_OUT
    : WA_BUBBLE_IN;
  const senderName = (msg.createdByUsername || '').trim();
  const metaMuted = isOut
    ? 'text-white/50'
    : 'text-gray-500 dark:text-gray-400';
  const hasMedia = Boolean(msg.attachmentKind && msg.attachmentUrl);

  return (
    <div className={`flex w-full items-end ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[75%] rounded-lg px-3 py-1.5 ${bubbleClass} ${
          msg.status === 'sending' ? 'opacity-80' : ''
        }`}
      >
        {hasMedia ? (
          <div
            className={
              msg.attachmentKind === 'audio'
                ? 'mb-1 w-full min-w-0'
                : 'mb-1 w-[min(70vw,20rem)] max-w-full'
            }
          >
            <ChatBlobMedia
              url={msg.attachmentUrl!}
              kind={msg.attachmentKind!}
              mine={isOut}
              filename={msg.attachmentFilename}
              attachmentWidth={msg.attachmentWidth}
              attachmentHeight={msg.attachmentHeight}
              t={t}
            />
          </div>
        ) : null}
        {msg.body.trim() ? (
          <WhatsAppFormattedText
            text={msg.body}
            as="p"
            dir="auto"
            className={`text-sm whitespace-pre-wrap break-words ${AUTO_DIR_CLASS}`}
          />
        ) : null}
        <div className={`mt-0.5 flex items-center justify-end gap-1.5 ${metaMuted}`}>
          {isOut && senderName ? (
            <span className="max-w-[9rem] truncate text-[10px] font-normal leading-none" dir="auto">
              {senderName}
            </span>
          ) : null}
          <span className="text-[10px] leading-none tabular-nums" dir="ltr">
            {msg.time}
          </span>
          {isOut && msg.status === 'sending' && (
            <span className="text-[10px] leading-none opacity-70">…</span>
          )}
          {isOut &&
            (msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read') && (
              <DeliveryTicks status={msg.status} />
            )}
        </div>
        {msg.status === 'failed' && msg.deliveryError && (
          <p className="mt-1 text-[11px] opacity-90" dir="auto">
            {msg.deliveryError}
          </p>
        )}
        {isOut && msg.status === 'failed' && (onResend || onDelete) && (
          <div className="mt-1 flex gap-2">
            {onResend && (
              <button
                type="button"
                className="text-[11px] underline opacity-90"
                disabled={resending}
                onClick={() => onResend(msg)}
              >
                {t('resend') || 'Resend'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="text-[11px] underline opacity-90"
                disabled={deleting}
                onClick={() => onDelete(msg)}
              >
                {t('delete') || 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
