import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PhoneIcon, PbxDialIcon, SmsIcon, WhatsappIcon } from './icons';
import type { PhoneNumber } from '../types';

export type LeadContactPhoneVariant = 'table' | 'details';

const ICON = 'h-[18px] w-[18px]';
const ICON_BTN =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

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
  t,
}: {
  phone: string;
  phoneType?: string;
  pbxEnabled?: boolean;
  onSms?: () => void;
  onWhatsApp?: () => void;
  onPbxDial?: () => void;
  t: (key: string) => string;
}) {
  const callTitle = phoneType
    ? `${t('call') || 'Call'} — ${phoneType}`
    : t('call') || 'Call';

  return (
    <>
      {onSms ? (
        <button
          type="button"
          onClick={onSms}
          className={`${ICON_BTN} text-sky-600 dark:text-sky-400`}
          title={t('sendSms') || 'Send SMS'}
        >
          <SmsIcon className={ICON} />
          <span className="sr-only">{t('sendSms') || 'Send SMS'}</span>
        </button>
      ) : null}
      {onWhatsApp ? (
        <button
          type="button"
          onClick={onWhatsApp}
          className={`${ICON_BTN} text-green-600 dark:text-green-400`}
          title={t('sendWhatsApp') || 'Send WhatsApp'}
        >
          <WhatsappIcon className={ICON} />
          <span className="sr-only">{t('sendWhatsApp') || 'Send WhatsApp'}</span>
        </button>
      ) : null}
      <a
        href={`tel:${sanitizeTel(phone)}`}
        className={`${ICON_BTN} text-primary dark:text-primary-300`}
        title={callTitle}
      >
        <PhoneIcon className={ICON} />
        <span className="sr-only">{callTitle}</span>
      </a>
      {pbxEnabled && onPbxDial ? (
        <button
          type="button"
          onClick={onPbxDial}
          className={`${ICON_BTN} text-violet-600 dark:text-violet-400`}
          title={t('dialViaPbx')}
        >
          <PbxDialIcon className={ICON} />
          <span className="sr-only">{t('dialViaPbx')}</span>
        </button>
      ) : null}
    </>
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

  const actions = (
    <span
      className="inline-flex shrink-0 items-center gap-0.5"
      role="group"
      aria-label={t('phoneNumbers') || 'Phone actions'}
    >
      <PhoneActions
        phone={phone}
        phoneType={phoneType}
        pbxEnabled={pbxEnabled}
        onSms={onSms}
        onWhatsApp={onWhatsApp}
        onPbxDial={onPbxDial}
        t={t}
      />
    </span>
  );

  const typeBadge = typeLabel ? (
    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{typeLabel}</span>
  ) : null;

  if (variant === 'details') {
    return (
      <div
        className={`w-full min-w-0 overflow-x-auto [scrollbar-width:thin] ${
          isArabic ? 'text-right' : 'text-left'
        } ${className}`}
      >
        <div
          className="inline-flex w-max shrink-0 items-center gap-2 whitespace-nowrap"
          dir="ltr"
          role="group"
        >
          <span
            className={`shrink-0 tabular-nums tracking-tight ${phoneClass}`}
            style={{ unicodeBidi: 'isolate' }}
          >
            {phone}
          </span>
          {typeBadge}
          {isPrimary ? (
            <span className="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400">
              {primaryLabel}
            </span>
          ) : null}
          {actions}
        </div>
      </div>
    );
  }

  if (isArabic) {
    return (
      <div
        className={`w-full min-w-0 overflow-x-auto [scrollbar-width:thin] text-right ${className}`}
      >
        <div
          className="inline-flex w-max max-w-full shrink-0 items-center gap-2 whitespace-nowrap"
          dir="ltr"
          role="group"
        >
          <span
            className={`shrink-0 tabular-nums tracking-tight ${phoneClass}`}
            style={{ unicodeBidi: 'isolate' }}
            title={phone}
          >
            {phone}
          </span>
          {typeBadge}
          {isPrimary ? (
            <span className="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400">
              {primaryLabel}
            </span>
          ) : null}
          {actions}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 overflow-x-auto [scrollbar-width:thin] ${className}`}>
      <div
        className="inline-flex w-max shrink-0 items-center gap-2 whitespace-nowrap"
        dir="ltr"
        role="group"
      >
        <span
          className={`shrink-0 tabular-nums tracking-tight ${phoneClass}`}
          style={{ unicodeBidi: 'isolate' }}
        >
          {phone}
        </span>
        {typeBadge}
        {isPrimary ? (
          <span className="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400">
            {primaryLabel}
          </span>
        ) : null}
        {actions}
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
        <LeadContactPhone
          key={pn.id ?? pn.phone_number}
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
      ))}
    </div>
  );
}

/** @deprecated Use LeadContactPhone */
export const LeadPhoneRow = LeadContactPhone;
/** @deprecated Use LeadContactPhoneList */
export const LeadPhoneList = LeadContactPhoneList;
