import React, { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, ClockIcon, StarIcon } from '../icons';
import { translations } from '../../constants';
import {
  WHATSAPP_STATUS_COLORS,
  chatStatusLabelKey,
} from '../../utils/whatsappConversationStatus';

export type ChatConversationStatusChange = {
  status?: string;
  snoozedUntil?: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
};

type Props = {
  t: (key: keyof typeof translations.en) => string;
  status: string;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
  onChange: (payload: ChatConversationStatusChange) => void;
};

const STATUS_OPTIONS = ['open', 'pending', 'spam', 'invalid', 'done'] as const;

/**
 * Header status menu shared by WhatsApp Chats and the social Inbox — colored
 * dots, snooze presets, star, unsubscribe. Kept out of ChatThread so Inbox can
 * reuse it without importing WhatsApp call chrome.
 */
export const ChatConversationStatusMenu: React.FC<Props> = ({
  t,
  status,
  isStarred = false,
  isUnsubscribed = false,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customSnooze, setCustomSnooze] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const statusKey = status || 'open';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSnoozeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSnoozeOpen(false);
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/25"
        aria-label={t('chatSetStatus')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/40"
          style={{ backgroundColor: WHATSAPP_STATUS_COLORS[statusKey] || '#94a3b8' }}
          aria-hidden
        />
        <span className="truncate">
          {t(chatStatusLabelKey(statusKey) as keyof typeof translations.en)}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
      </button>
      {open ? (
        <div className="absolute end-0 top-full z-40 mt-1 w-52 rounded-lg border border-gray-200 bg-white py-1 text-sm text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          {!snoozeOpen ? (
            <>
              {STATUS_OPTIONS.map((st) => (
                <button
                  key={st}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => {
                    onChange({ status: st });
                    setOpen(false);
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: WHATSAPP_STATUS_COLORS[st] || '#94a3b8' }}
                    aria-hidden
                  />
                  {t(chatStatusLabelKey(st) as keyof typeof translations.en)}
                </button>
              ))}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setSnoozeOpen(true)}
              >
                <ClockIcon className="h-3.5 w-3.5" />
                {t('chatSnoozeUntil')}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange({ isStarred: !isStarred });
                  setOpen(false);
                }}
              >
                <StarIcon className="h-3.5 w-3.5" />
                {isStarred ? t('chatUnstar') : t('chatStar')}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange({ isUnsubscribed: !isUnsubscribed });
                  setOpen(false);
                }}
              >
                {isUnsubscribed ? t('chatResubscribe') : t('chatMarkUnsubscribed')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange({
                    status: 'snoozed',
                    snoozedUntil: new Date(Date.now() + 3600_000).toISOString(),
                  });
                  setOpen(false);
                  setSnoozeOpen(false);
                }}
              >
                {t('chatSnooze1h')}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange({
                    status: 'snoozed',
                    snoozedUntil: new Date(Date.now() + 3 * 3600_000).toISOString(),
                  });
                  setOpen(false);
                  setSnoozeOpen(false);
                }}
              >
                {t('chatSnooze3h')}
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  onChange({
                    status: 'snoozed',
                    snoozedUntil: d.toISOString(),
                  });
                  setOpen(false);
                  setSnoozeOpen(false);
                }}
              >
                {t('chatSnoozeTomorrow')}
              </button>
              <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                <label className="mb-1 block text-[11px] text-gray-500">
                  {t('chatSnoozeCustom')}
                </label>
                <input
                  type="datetime-local"
                  value={customSnooze}
                  onChange={(e) => setCustomSnooze(e.target.value)}
                  className="mb-2 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                />
                <button
                  type="button"
                  className="w-full rounded bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                  disabled={!customSnooze}
                  onClick={() => {
                    const dt = new Date(customSnooze);
                    if (Number.isNaN(dt.getTime())) return;
                    onChange({
                      status: 'snoozed',
                      snoozedUntil: dt.toISOString(),
                    });
                    setOpen(false);
                    setSnoozeOpen(false);
                  }}
                >
                  {t('chatSnoozeUntil')}
                </button>
              </div>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-start text-gray-500"
                onClick={() => setSnoozeOpen(false)}
              >
                {t('back')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
