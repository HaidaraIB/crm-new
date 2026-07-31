import React from 'react';
import { WhatsAppFormattedText } from '../../utils/whatsappFormatting';
import { WA_BUBBLE_IN, WA_BUBBLE_OUT, WA_BUBBLE_OUT_FAILED, WA_SENDER_CHIP, WA_TICK_READ } from './whatsappChatTheme';

export type ChatBubbleMessage = {
  id: string;
  body: string;
  direction: 'in' | 'out';
  time: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveryError?: string;
  createdByUsername?: string | null;
  apiId?: number;
};

function senderInitials(username?: string | null): string {
  const s = (username || '').trim();
  if (!s) return 'WA';
  const parts = s.split(/[\s._@-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
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

  return (
    <div className={`flex items-end gap-1.5 ${isOut ? 'justify-end' : 'justify-start'}`}>
      {isOut && (
        <div
          className={WA_SENDER_CHIP}
          title={msg.createdByUsername || t('whatsApp') || 'WhatsApp'}
          aria-label={msg.createdByUsername || 'WhatsApp'}
        >
          {senderInitials(msg.createdByUsername)}
        </div>
      )}
      <div
        className={`group relative max-w-[75%] rounded-lg px-3 py-1.5 ${bubbleClass} ${
          msg.status === 'sending' ? 'opacity-80' : ''
        }`}
      >
        <WhatsAppFormattedText text={msg.body} as="p" className="text-sm whitespace-pre-wrap break-words" />
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px] opacity-70">{msg.time}</span>
          {isOut && msg.status === 'read' && (
            <span className={`text-[10px] ${WA_TICK_READ}`} aria-hidden>
              ✓✓
            </span>
          )}
          {isOut && (msg.status === 'sent' || msg.status === 'delivered') && (
            <span className="text-[10px] opacity-60" aria-hidden>
              ✓✓
            </span>
          )}
          {isOut && msg.status === 'sending' && (
            <span className="text-[10px] opacity-60">…</span>
          )}
        </div>
        {msg.status === 'failed' && msg.deliveryError && (
          <p className="text-[11px] mt-1 opacity-90">{msg.deliveryError}</p>
        )}
        {isOut && msg.status === 'failed' && (onResend || onDelete) && (
          <div className="flex gap-2 mt-1">
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
