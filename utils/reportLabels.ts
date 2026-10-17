import type { translations } from '../constants';
import type { ResponseBucketKey } from '../services/reportsTypes';

export type TKey = keyof typeof translations.en;
type Translate = (key: TKey) => string;

export const REPORT_SOURCES = [
  'manual',
  'meta_lead_form',
  'whatsapp',
  'instagram',
  'messenger',
  'tiktok',
  'api',
  'mujeb',
  'other',
] as const;

const SOURCE_KEYS: Record<string, TKey> = {
  manual: 'manualSource',
  meta_lead_form: 'metaLeadForm',
  whatsapp: 'whatsappSource',
  instagram: 'reportSourceInstagram',
  messenger: 'reportSourceMessenger',
  tiktok: 'tiktokSource',
  api: 'leadApiSource',
  mujeb: 'mujebSource',
  other: 'otherSource',
};

export function sourceLabel(source: string | null | undefined, t: Translate): string {
  if (!source) return '—';
  const key = SOURCE_KEYS[source];
  return key ? t(key) : source;
}

export const BUCKET_LABEL_KEYS: Record<ResponseBucketKey, TKey> = {
  lt_5m: 'reportBucketLt5m',
  '5_15m': 'reportBucket5to15m',
  '15_60m': 'reportBucket15to60m',
  '1_4h': 'reportBucket1to4h',
  '4_24h': 'reportBucket4to24h',
  gt_24h: 'reportBucketGt24h',
  no_response: 'reportBucketNoResponse',
};

const KIND_KEYS: Record<string, TKey> = {
  call: 'reportKindCall',
  task: 'reportKindTask',
  visit: 'reportKindVisit',
  whatsapp: 'reportKindWhatsapp',
  sms: 'reportKindSms',
  status_change: 'reportKindStatusChange',
  deal: 'reportKindDeal',
  note: 'reportKindNote',
};

export function responseKindLabel(kind: string | null | undefined, t: Translate): string {
  if (!kind) return '—';
  const key = KIND_KEYS[kind];
  return key ? t(key) : kind;
}

export const LEAD_TYPES = ['fresh', 'hot', 'cold'] as const;
const LEAD_TYPE_KEYS: Record<string, TKey> = { fresh: 'freshLeads', hot: 'hotLeads', cold: 'coldLeads' };

export function leadTypeLabel(type: string, t: Translate): string {
  return LEAD_TYPE_KEYS[type] ? t(LEAD_TYPE_KEYS[type]) : type;
}

const CHANNEL_KEYS: Record<string, TKey> = { whatsapp: 'whatsappSource', sms: 'reportKindSms' };

export function channelLabel(channel: string, t: Translate): string {
  return CHANNEL_KEYS[channel] ? t(CHANNEL_KEYS[channel]) : channel;
}

export const WEEKDAY_KEYS = [
  'reportWeekdayMon',
  'reportWeekdayTue',
  'reportWeekdayWed',
  'reportWeekdayThu',
  'reportWeekdayFri',
  'reportWeekdaySat',
  'reportWeekdaySun',
] as const;

const TRANSITION_SOURCE_KEYS: Record<string, TKey> = {
  manual: 'reportTransitionSource_manual',
  bulk: 'reportTransitionSource_bulk',
  automation: 'reportTransitionSource_automation',
  integration: 'reportTransitionSource_integration',
  system: 'reportTransitionSource_system',
  backfill: 'reportTransitionSource_backfill',
};

export function transitionSourceLabel(source: string, t: Translate): string {
  const key = TRANSITION_SOURCE_KEYS[source];
  return key ? t(key) : source;
}
