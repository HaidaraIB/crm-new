import React from 'react';
import { ChatBlobMedia } from '../chat/ChatBlobMedia';
import { MapPinIcon } from '../icons';
import { WhatsAppFormattedText } from '../../utils/whatsappFormatting';
import {
  isWhatsAppTypeStubBody,
  localizeWhatsAppMessageBody,
} from '../../utils/whatsappMessageBodyDisplay';
import { localizeMetaDeliveryError } from '../../utils/whatsappMetaErrorDisplay';
import { clientLocationMapsUrl } from '../../utils/leadLocation';
import { translations } from '../../constants';
import { WA_BUBBLE_IN, WA_BUBBLE_OUT, WA_BUBBLE_OUT_FAILED, WA_TICK_READ } from './whatsappChatTheme';

export type ChatBubbleMessage = {
  id: string;
  body: string;
  direction: 'in' | 'out';
  time: string;
  /** ISO timestamp for status separators (day / conversation started). */
  createdAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deliveryError?: string;
  createdByUsername?: string | null;
  apiId?: number;
  attachmentKind?: 'image' | 'video' | 'audio' | 'document' | 'location' | null;
  attachmentUrl?: string | null;
  attachmentFilename?: string | null;
  attachmentWidth?: number | null;
  attachmentHeight?: number | null;
  isVoiceNote?: boolean;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationName?: string | null;
  locationAddress?: string | null;
  /** True when this message used a different Meta phone_number_id than the currently connected one. */
  fromPreviousNumber?: boolean;
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

function LocationBubbleCard({
  msg,
  t,
  isOut,
}: {
  msg: ChatBubbleMessage;
  t: (key: keyof typeof translations.en) => string;
  isOut: boolean;
}) {
  const lat = msg.locationLatitude;
  const lng = msg.locationLongitude;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  const mapsUrl = hasCoords ? clientLocationMapsUrl(`${lat},${lng}`) : null;
  const title =
    (msg.locationName || '').trim() ||
    (msg.locationAddress || '').trim() ||
    t('whatsappMediaLocationPlaceholder');
  const subtitle = (msg.locationName || '').trim()
    ? (msg.locationAddress || '').trim()
    : '';
  const coordsLabel = hasCoords ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : null;
  const linkMuted = isOut ? 'text-white/90 hover:text-white' : 'text-primary hover:underline';
  const subMuted = isOut ? 'text-white/70' : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="mb-1 w-[min(70vw,16rem)] max-w-full">
      <div
        className={`flex gap-2 rounded-md px-2.5 py-2 ${
          isOut ? 'bg-black/10' : 'bg-black/[0.04] dark:bg-white/5'
        }`}
      >
        <span
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
            isOut ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          }`}
        >
          <MapPinIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${AUTO_DIR_CLASS}`} dir="auto">
            {title}
          </p>
          {subtitle ? (
            <p className={`mt-0.5 truncate text-xs ${subMuted} ${AUTO_DIR_CLASS}`} dir="auto">
              {subtitle}
            </p>
          ) : null}
          {coordsLabel ? (
            <p className={`mt-0.5 font-mono text-[10px] tabular-nums ${subMuted}`} dir="ltr">
              {coordsLabel}
            </p>
          ) : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-1 inline-block text-xs font-medium ${linkMuted}`}
            >
              {t('openInMaps')}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  msg: ChatBubbleMessage;
  t: (key: keyof typeof translations.en) => string;
  onDelete?: (msg: ChatBubbleMessage) => void;
  onResend?: (msg: ChatBubbleMessage) => void;
  deleting?: boolean;
  resending?: boolean;
  onOpenMedia?: (msg: ChatBubbleMessage) => void;
};

export const ChatMessageBubble: React.FC<Props> = ({
  msg,
  t,
  onDelete,
  onResend,
  deleting,
  resending,
  onOpenMedia,
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
  const hasLocation =
    msg.attachmentKind === 'location' ||
    (msg.locationLatitude != null &&
      msg.locationLongitude != null &&
      Number.isFinite(msg.locationLatitude) &&
      Number.isFinite(msg.locationLongitude));
  const hasFileMedia = Boolean(
    msg.attachmentKind &&
      msg.attachmentKind !== 'location' &&
      msg.attachmentUrl
  );
  const displayBody = hasLocation || hasFileMedia
    ? isWhatsAppTypeStubBody(msg.body)
      ? ''
      : hasLocation
        ? ''
        : msg.body
    : localizeWhatsAppMessageBody(msg.body, t);

  return (
    <div className={`flex w-full items-end ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[75%] rounded-lg px-3 py-1.5 ${bubbleClass} ${
          msg.status === 'sending' ? 'opacity-80' : ''
        }`}
      >
        {hasLocation ? <LocationBubbleCard msg={msg} t={t} isOut={isOut} /> : null}
        {hasFileMedia ? (
          <div
            className={
              msg.attachmentKind === 'audio'
                ? 'mb-1 w-full min-w-0'
                : 'mb-1 w-[min(70vw,20rem)] max-w-full'
            }
          >
            <ChatBlobMedia
              url={msg.attachmentUrl!}
              kind={msg.attachmentKind as 'image' | 'video' | 'audio' | 'document'}
              mine={isOut}
              filename={msg.attachmentFilename}
              attachmentWidth={msg.attachmentWidth}
              attachmentHeight={msg.attachmentHeight}
              t={t}
              onOpen={
                onOpenMedia &&
                (msg.attachmentKind === 'image' || msg.attachmentKind === 'video')
                  ? () => onOpenMedia(msg)
                  : undefined
              }
            />
          </div>
        ) : null}
        {displayBody.trim() ? (
          <WhatsAppFormattedText
            text={displayBody}
            as="p"
            dir="auto"
            className={`text-sm whitespace-pre-wrap break-words ${AUTO_DIR_CLASS}`}
          />
        ) : null}
        {msg.fromPreviousNumber ? (
          <span
            className={`mt-1 inline-flex max-w-full rounded px-1.5 py-0.5 text-[10px] font-medium leading-none ${
              isOut
                ? 'bg-white/15 text-white/85'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
            }`}
          >
            {t('whatsappViaPreviousNumber')}
          </span>
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
            {localizeMetaDeliveryError(msg.deliveryError, t)}
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
                {t('resend')}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="text-[11px] underline opacity-90"
                disabled={deleting}
                onClick={() => onDelete(msg)}
              >
                {t('delete')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
