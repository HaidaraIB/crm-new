import type { ChatBubbleMessage } from '../components/whatsapp/ChatMessageBubble';
import { blobMediaKind } from '../components/inbox/InboxMessageList';
import type { translations } from '../constants';
import { getSocialMessageAttachmentUrl, type SocialMessagePayload } from '../services/api';
import { ARABIC_DATE_LOCALE, withLatinDigits } from './dateUtils';

export function mapDeliveryStatusToBubbleStatus(
  deliveryStatus: string | null | undefined
): ChatBubbleMessage['status'] {
  const delivery = String(deliveryStatus || 'sent').toLowerCase();
  if (delivery === 'failed') return 'failed';
  if (delivery === 'pending' || delivery === 'sending') return 'sending';
  if (delivery === 'delivered') return 'delivered';
  if (delivery === 'read') return 'read';
  return 'sent';
}

function formatBubbleTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(
    language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
    withLatinDigits({ hour: '2-digit', minute: '2-digit' })
  );
}

function parseCoord(value: string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function socialAttachmentKind(
  message: SocialMessagePayload
): ChatBubbleMessage['attachmentKind'] {
  const lat = parseCoord(message.location_latitude);
  const lng = parseCoord(message.location_longitude);
  if (lat != null && lng != null) return 'location';
  if (message.has_attachment) {
    return blobMediaKind(message.attachment_kind);
  }
  if (message.attachment_kind === 'location') return 'location';
  return null;
}

export function socialPlaceholderLabel(
  message: SocialMessagePayload,
  t: (key: keyof typeof translations.en) => string
): string | undefined {
  if (message.has_attachment) return undefined;
  const kind = message.attachment_kind;
  if (kind === 'story_mention') return t('storyMention');
  if (kind === 'share') return t('sharedPost');
  if (kind === 'reel') return t('sharedReel');
  return undefined;
}

export function socialMessageToBubble(
  message: SocialMessagePayload,
  language: string,
  t: (key: keyof typeof translations.en) => string
): ChatBubbleMessage {
  const attachmentKind = socialAttachmentKind(message);
  const mediaKind = message.has_attachment ? blobMediaKind(message.attachment_kind) : null;
  const createdAt = message.sent_at || message.created_at;
  return {
    id: `social-${message.id}`,
    apiId: message.id,
    body: message.body || '',
    direction: message.direction === 'outbound' ? 'out' : 'in',
    time: formatBubbleTime(createdAt, language),
    createdAt: createdAt || undefined,
    status: mapDeliveryStatusToBubbleStatus(message.delivery_status),
    deliveryError: message.delivery_error || undefined,
    createdByUsername: message.created_by_username,
    attachmentKind,
    attachmentUrl:
      mediaKind && message.has_attachment ? getSocialMessageAttachmentUrl(message.id) : null,
    attachmentFilename: message.original_filename || null,
    attachmentWidth: message.attachment_width ?? null,
    attachmentHeight: message.attachment_height ?? null,
    isVoiceNote: Boolean(message.is_voice_note),
    locationLatitude: parseCoord(message.location_latitude),
    locationLongitude: parseCoord(message.location_longitude),
    locationName: message.location_name || null,
    locationAddress: message.location_address || null,
    reaction: message.reaction || undefined,
    isEcho: message.is_echo || undefined,
    placeholderLabel: socialPlaceholderLabel(message, t),
  };
}

type LeadWaRow = {
  id: number;
  body: string;
  direction: string;
  created_at: string;
  delivery_status?: string | null;
  delivery_error?: string | null;
  created_by_username?: string | null;
  attachment_kind?: string | null;
  attachment_url?: string | null;
  original_filename?: string | null;
  attachment_width?: number | null;
  attachment_height?: number | null;
  is_voice_note?: boolean;
  location_latitude?: string | number | null;
  location_longitude?: string | number | null;
  location_name?: string | null;
  location_address?: string | null;
  phone_number_id?: string | null;
};

export function leadWhatsAppRowToBubble(
  wa: LeadWaRow,
  language: string,
  currentWhatsAppPhoneNumberId?: string | null
): ChatBubbleMessage {
  const delivery = mapDeliveryStatusToBubbleStatus(wa.delivery_status);
  const msgPhoneId = String(wa.phone_number_id || '').trim();
  const fromPreviousNumber = Boolean(
    currentWhatsAppPhoneNumberId && msgPhoneId && msgPhoneId !== currentWhatsAppPhoneNumberId
  );
  const lat =
    wa.location_latitude != null && wa.location_latitude !== ''
      ? Number(wa.location_latitude)
      : null;
  const lng =
    wa.location_longitude != null && wa.location_longitude !== ''
      ? Number(wa.location_longitude)
      : null;
  return {
    id: `api-${wa.id}`,
    body: wa.body,
    direction: wa.direction === 'outbound' ? 'out' : 'in',
    time: formatBubbleTime(wa.created_at, language),
    createdAt: wa.created_at,
    status: delivery,
    deliveryError: wa.delivery_error || undefined,
    createdByUsername: wa.created_by_username || null,
    apiId: wa.id,
    attachmentKind: (wa.attachment_kind as ChatBubbleMessage['attachmentKind']) || null,
    attachmentUrl: wa.attachment_url || null,
    attachmentFilename: wa.original_filename || null,
    attachmentWidth: wa.attachment_width ?? null,
    attachmentHeight: wa.attachment_height ?? null,
    isVoiceNote: Boolean(wa.is_voice_note),
    locationLatitude: lat != null && Number.isFinite(lat) ? lat : null,
    locationLongitude: lng != null && Number.isFinite(lng) ? lng : null,
    locationName: wa.location_name || null,
    locationAddress: wa.location_address || null,
    fromPreviousNumber,
  };
}
