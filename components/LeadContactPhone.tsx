import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PhoneIcon, PbxDialIcon, SmsIcon, WhatsappIcon } from './icons';
import { MarqueeText } from './MarqueeText';
import type { PhoneNumber } from '../types';

export type LeadContactPhoneVariant = 'table' | 'details';

const ICON = 'h-[18px] w-[18px]';
const ICON_COMPACT = 'h-4 w-4';
const ICON_BTN =
  'inline-flex shrink-0 items-center justify-center rounded transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
const ICON_BTN_SIZE = 'h-7 w-7';
const ICON_BTN_SIZE_COMPACT = 'h-6 w-6';
const ACTION_CELL = 'inline-flex items-center justify-center';
const ACTION_CELL_SIZE = 'h-7 w-7';
const ACTION_CELL_SIZE_COMPACT = 'h-6 w-6';

/** Fixed columns: phone (marquee) | type | primary | sms | wa | call | pbx */
function phoneGridClass(variant: LeadContactPhoneVariant): string {
  const base = 'grid w-full min-w-0 items-center';
  if (variant === 'table') {
    return `${base} grid-cols-[minmax(4.5rem,1fr)_2.25rem_2.5rem_repeat(4,1.25rem)] gap-x-px gap-y-0.5`;
  }
  return `${base} grid-cols-[minmax(6rem,1fr)_3rem_3.25rem_repeat(4,1.5rem)] gap-x-1 gap-y-1`;
}

function sanitizeTel(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

function PhoneActions({
  phone,
  phoneType,
  pbxEnabled,
  onSms,
  onWhatsApp,
  onPbxDial,
  compact,
  t,
}: {
  phone: string;
  phoneType?: string;
  pbxEnabled?: boolean;
  onSms?: () => void;
  onWhatsApp?: () => void;
  onPbxDial?: () => void;
  compact?: boolean;
  t: (key: string) => string;
}) {
  const iconClass = compact ? ICON_COMPACT : ICON;
  const btnClass = `${ICON_BTN} ${compact ? ICON_BTN_SIZE_COMPACT : ICON_BTN_SIZE}`;
  const cellClass = `${ACTION_CELL} ${compact ? ACTION_CELL_SIZE_COMPACT : ACTION_CELL_SIZE}`;
  const placeholderClass = compact ? 'inline-block h-6 w-6' : 'inline-block h-7 w-7';
  const callTitle = phoneType
    ? `${t('call') || 'Call'} — ${phoneType}`
    : t('call') || 'Call';

  return (
    <div className="contents" role="group" aria-label={t('phoneNumbers') || 'Phone actions'}>
      <span className={cellClass}>
        {onSms ? (
          <button
            type="button"
            onClick={onSms}
            className={`${btnClass} text-sky-600 dark:text-sky-400`}
            title={t('sendSms') || 'Send SMS'}
          >
            <SmsIcon className={iconClass} />
            <span className="sr-only">{t('sendSms') || 'Send SMS'}</span>
          </button>
        ) : (
          <span className={placeholderClass} aria-hidden />
        )}
      </span>
      <span className={cellClass}>
        {onWhatsApp ? (
          <button
            type="button"
            onClick={onWhatsApp}
            className={`${btnClass} text-green-600 dark:text-green-400`}
            title={t('sendWhatsApp') || 'Send WhatsApp'}
          >
            <WhatsappIcon className={iconClass} />
            <span className="sr-only">{t('sendWhatsApp') || 'Send WhatsApp'}</span>
          </button>
        ) : (
          <span className={placeholderClass} aria-hidden />
        )}
      </span>
      <span className={cellClass}>
        <a
          href={`tel:${sanitizeTel(phone)}`}
          className={`${btnClass} text-primary dark:text-primary-300`}
          title={callTitle}
        >
          <PhoneIcon className={iconClass} />
          <span className="sr-only">{callTitle}</span>
        </a>
      </span>
      <span className={cellClass}>
        {pbxEnabled && onPbxDial ? (
          <button
            type="button"
            onClick={onPbxDial}
            className={`${btnClass} text-violet-600 dark:text-violet-400`}
            title={t('dialViaPbx')}
          >
            <PbxDialIcon className={iconClass} />
            <span className="sr-only">{t('dialViaPbx')}</span>
          </button>
        ) : (
          <span className={placeholderClass} aria-hidden />
        )}
      </span>
    </div>
  );
}

export type LeadContactPhoneProps = {
  phone: string;
  phoneType?: PhoneNumber['phone_type'] | string;
  isPrimary?: boolean;
  variant: LeadContactPhoneVariant;
  pbxEnabled?: boolean;
  onSms?: () => void;
  onWhatsApp?: () => void;
  onPbxDial?: () => void;
  t: (key: string) => string;
  className?: string;
};

function formatPhoneTypeLabel(
  phoneType: string | undefined,
  t: (key: string) => string
): string | null {
  if (!phoneType) return null;
  const key = phoneType.toLowerCase();
  const translated = t(key);
  return translated && translated !== key ? translated : phoneType;
}

export function LeadContactPhone({
  phone,
  phoneType,
  isPrimary,
  variant,
  pbxEnabled,
  onSms,
  onWhatsApp,
  onPbxDial,
  t,
  className = '',
}: LeadContactPhoneProps) {
  const { language } = useAppContext();
  const isArabic = language === 'ar';
  const primaryLabel = t('primary') || 'Primary';
  const typeLabel = formatPhoneTypeLabel(phoneType, t);
  const phoneClass =
    variant === 'details'
      ? 'text-base font-semibold text-gray-900 dark:text-gray-100'
      : 'text-sm font-medium text-gray-900 dark:text-gray-100';
  const phoneTextClass = `tabular-nums tracking-tight [unicode-bidi:isolate] ${phoneClass}`;
  const compact = variant === 'table';
  const metaTextClass = compact ? 'text-[10px] leading-tight' : 'text-xs';

  return (
    <div className={`w-full min-w-0 ${isArabic ? 'text-right' : 'text-left'} ${className}`}>
      <div
        className={phoneGridClass(variant)}
        dir="ltr"
        role="group"
        aria-label={t('phoneNumbers') || 'Phone numbers'}
      >
        <MarqueeText
          text={phone}
          className="min-w-0 w-full overflow-hidden"
          contentClassName={phoneTextClass}
        />
        <div
          className={`min-w-0 truncate ${metaTextClass} text-gray-500 dark:text-gray-400`}
          title={typeLabel || undefined}
        >
          {typeLabel || <span className="invisible select-none">Mob</span>}
        </div>
        <div
          className={`min-w-0 truncate ${metaTextClass} font-medium text-primary-600 dark:text-primary-400`}
          title={isPrimary ? primaryLabel : undefined}
        >
          {isPrimary ? primaryLabel : <span className="invisible select-none">Pri</span>}
        </div>
        <PhoneActions
          phone={phone}
          phoneType={phoneType}
          pbxEnabled={pbxEnabled}
          onSms={onSms}
          onWhatsApp={onWhatsApp}
          onPbxDial={onPbxDial}
          compact={compact}
          t={t}
        />
      </div>
    </div>
  );
}

export type LeadContactPhoneListProps = {
  phoneNumbers?: PhoneNumber[];
  fallbackPhone?: string;
  variant: LeadContactPhoneVariant;
  pbxEnabled?: boolean;
  onSms: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onPbxDial?: (phone: string) => void;
  t: (key: string) => string;
  className?: string;
  emptyLabel?: string;
};

export function LeadContactPhoneList({
  phoneNumbers,
  fallbackPhone,
  variant,
  pbxEnabled,
  onSms,
  onWhatsApp,
  onPbxDial,
  t,
  className = '',
  emptyLabel = '-',
}: LeadContactPhoneListProps) {
  const rows =
    phoneNumbers && phoneNumbers.length > 0
      ? phoneNumbers
      : fallbackPhone
        ? [{ id: 0, phone_number: fallbackPhone, phone_type: 'mobile' as const, is_primary: true }]
        : [];

  if (rows.length === 0) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</span>;
  }

  return (
    <div className={`flex w-full min-w-0 flex-col gap-2 ${className}`}>
      {rows.map((pn) => (
        <div key={pn.id ?? pn.phone_number} className="w-full min-w-0">
          <LeadContactPhone
            phone={pn.phone_number}
            phoneType={pn.phone_type}
            isPrimary={pn.is_primary}
            variant={variant}
            pbxEnabled={pbxEnabled}
            onSms={() => onSms(pn.phone_number)}
            onWhatsApp={() => onWhatsApp(pn.phone_number)}
            onPbxDial={onPbxDial ? () => onPbxDial(pn.phone_number) : undefined}
            t={t}
          />
        </div>
      ))}
    </div>
  );
}

/** @deprecated Use LeadContactPhone */
export const LeadPhoneRow = LeadContactPhone;
/** @deprecated Use LeadContactPhoneList */
export const LeadPhoneList = LeadContactPhoneList;
