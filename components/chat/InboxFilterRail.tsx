import React, { useEffect, useState } from 'react';
import { translations } from '../../constants';
import { chatStatusLabelKey } from '../../utils/whatsappConversationStatus';
import {
  ArrowLeftIcon,
  InboxIcon,
  InstagramIcon,
  MessengerIcon,
} from '../icons';
import {
  RAIL_COLLAPSED_ASIDE,
  RAIL_COLLAPSE_BTN,
  RAIL_EXPAND_BTN,
  RAIL_EXPANDED_ASIDE,
  RailCountBadge,
  RailFilterSection,
  RailStatusIcon,
  chipNavClass,
  iconNavClass,
  statusNavClass,
} from './chatFilterRailChrome';

export const INBOX_STATUS_FILTERS = [
  'all',
  'open',
  'pending',
  'done',
  'snoozed',
  'spam',
  'invalid',
] as const;

export const INBOX_CHANNEL_FILTERS = [
  { value: 'all', labelKey: 'allChannels' as const },
  { value: 'instagram', labelKey: 'instagramDirect' as const },
  { value: 'messenger', labelKey: 'facebookMessenger' as const },
];

const RAIL_COLLAPSED_STORAGE_KEY = 'crm.socialInboxFilterRailCollapsed';

type Translate = (key: keyof typeof translations.en) => string;

type Props = {
  channel: string;
  status: string;
  onChannelChange: (channel: string) => void;
  onStatusChange: (status: string) => void;
  statusCounts: Record<string, number>;
  t: Translate;
  variant?: 'rail' | 'chips';
};

function ChannelIcon({
  channel,
  className = 'h-4 w-4 shrink-0 opacity-70',
}: {
  channel: string;
  className?: string;
}) {
  if (channel === 'instagram') return <InstagramIcon className={className} />;
  if (channel === 'messenger') return <MessengerIcon className={className} />;
  return <InboxIcon className={className} />;
}

function statusCount(key: string, counts: Record<string, number>): number {
  if (key !== 'all') return counts[key] ?? 0;
  if (typeof counts.all === 'number') return counts.all;
  return Object.entries(counts)
    .filter(([k]) => k !== 'all')
    .reduce((n, [, v]) => n + (Number(v) || 0), 0);
}

export const InboxFilterRail: React.FC<Props> = ({
  channel,
  status,
  onChannelChange,
  onStatusChange,
  statusCounts,
  t,
  variant = 'rail',
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(RAIL_COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  if (variant === 'chips') {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('chatFilterChannel')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {INBOX_CHANNEL_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChannelChange(option.value)}
                className={chipNavClass(channel === option.value)}
              >
                <ChannelIcon channel={option.value} className="h-3.5 w-3.5 shrink-0" />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('chatFilterStatus')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {INBOX_STATUS_FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onStatusChange(key)}
                className={chipNavClass(status === key)}
              >
                {t(chatStatusLabelKey(key) as keyof typeof translations.en)}
                <span className="tabular-nums opacity-70">{statusCount(key, statusCounts)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <aside className={RAIL_COLLAPSED_ASIDE}>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={RAIL_EXPAND_BTN}
          aria-label={t('chatFilterRailExpand')}
          title={t('chatFilterRailExpand')}
        >
          <ArrowLeftIcon className="h-4 w-4 rotate-180" />
        </button>
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
        {INBOX_CHANNEL_FILTERS.map((option) => {
          const active = channel === option.value;
          const label = t(option.labelKey);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChannelChange(option.value)}
              className={iconNavClass(active)}
              aria-current={active ? 'true' : undefined}
              aria-label={label}
              title={label}
            >
              <ChannelIcon channel={option.value} />
            </button>
          );
        })}
        <div className="h-px w-8 bg-gray-200 dark:bg-gray-700" />
        {INBOX_STATUS_FILTERS.map((key) => {
          const active = status === key;
          const label = t(chatStatusLabelKey(key) as keyof typeof translations.en);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusChange(key)}
              className={iconNavClass(active)}
              aria-current={active ? 'true' : undefined}
              aria-label={label}
              title={label}
            >
              <RailStatusIcon status={key} />
              <RailCountBadge count={statusCount(key, statusCounts)} />
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className={RAIL_EXPANDED_ASIDE}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t('filters')}
        </p>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className={RAIL_COLLAPSE_BTN}
          aria-label={t('chatFilterRailCollapse')}
          title={t('chatFilterRailCollapse')}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>

      <RailFilterSection label={t('chatFilterChannel')}>
        {INBOX_CHANNEL_FILTERS.map((option) => {
          const active = channel === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChannelChange(option.value)}
              className={statusNavClass(active)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <ChannelIcon channel={option.value} />
                <span className="truncate">{t(option.labelKey)}</span>
              </span>
            </button>
          );
        })}
      </RailFilterSection>

      <RailFilterSection label={t('chatFilterStatus')}>
        {INBOX_STATUS_FILTERS.map((key) => {
          const active = status === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onStatusChange(key)}
              className={statusNavClass(active)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <RailStatusIcon status={key} />
                <span className="truncate">
                  {t(chatStatusLabelKey(key) as keyof typeof translations.en)}
                </span>
              </span>
              <span className="tabular-nums text-xs text-gray-400">
                {statusCount(key, statusCounts)}
              </span>
            </button>
          );
        })}
      </RailFilterSection>
    </aside>
  );
};
