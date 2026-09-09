import React from 'react';
import {
  ChatBubbleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  UserMinusIcon,
  XIcon,
} from '../icons';

/** Shared filter-rail chrome for WhatsApp Chats and the social Inbox. */

export const RAIL_EXPANDED_ASIDE =
  'flex h-full w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none lg:w-52 xl:w-56';

export const RAIL_COLLAPSED_ASIDE =
  'flex h-full w-14 shrink-0 flex-col items-center gap-2 overflow-y-auto rounded-xl border border-gray-200/90 bg-white py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900/80 dark:shadow-none';

export const RAIL_COLLAPSE_BTN =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100';

export const RAIL_EXPAND_BTN =
  'flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-100';

const filterBtnBase =
  'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors';

export function statusNavClass(active: boolean): string {
  return active
    ? `${filterBtnBase} bg-primary/10 font-semibold text-primary-800 ring-1 ring-primary/25 dark:bg-primary/20 dark:text-primary-100 dark:ring-primary/35`
    : `${filterBtnBase} text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/80`;
}

export function iconNavClass(active: boolean): string {
  return active
    ? 'relative flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary-800 ring-1 ring-primary/25 dark:bg-primary/20 dark:text-primary-100 dark:ring-primary/35'
    : 'relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/80';
}

export function chipNavClass(active: boolean): string {
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
    active
      ? 'border-primary/40 bg-primary/10 text-primary-800 dark:text-primary-100'
      : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
  }`;
}

export const RailFilterSection: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <div className="space-y-1">{children}</div>
  </div>
);

export const RailStatusIcon: React.FC<{ status: string; className?: string }> = ({
  status,
  className = 'h-4 w-4 shrink-0 opacity-70',
}) => {
  switch (status) {
    case 'all':
      return <FileTextIcon className={className} />;
    case 'open':
      return <ChatBubbleIcon className={className} />;
    case 'pending':
      return (
        <span className={`${className} inline-flex items-center justify-center text-xs font-bold`}>
          !
        </span>
      );
    case 'spam':
      return <XIcon className={className} />;
    case 'invalid':
      return <UserMinusIcon className={className} />;
    case 'done':
      return <CheckIcon className={className} />;
    case 'snoozed':
      return <ClockIcon className={className} />;
    case 'unread':
      return <ChatBubbleIcon className={className} />;
    case 'unsubscribed':
      return <UserMinusIcon className={className} />;
    default:
      return <FileTextIcon className={className} />;
  }
};

export function RailCountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -end-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
