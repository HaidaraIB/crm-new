import React, { useEffect, useRef, useState } from 'react';
import { Button, Loader, PhoneText, isPhoneLike, PlusIcon } from '../index';
import { LeadStatusBadge } from '../LeadStatusDropdown';
import {
  ClockIcon,
  MoreVerticalIcon,
  SearchIcon,
  StarIcon,
  TrashIcon,
} from '../icons';
import {
  getWhatsAppContactAvatarLabel,
  getWhatsAppContactSubtitle,
  getWhatsAppContactTitle,
} from '../../utils/whatsappContactDisplay';
import {
  WA_AVATAR,
  WA_HEADER_BAR,
  WA_LIST_ACTIVE,
  WA_LIST_BG,
  WA_LIST_HOVER,
} from './whatsappChatTheme';
import { translations } from '../../constants';
import { ARABIC_DATE_LOCALE, withLatinDigits } from '../../utils/dateUtils';
import { localizeWhatsAppMessageBody } from '../../utils/whatsappMessageBodyDisplay';
import {
  WHATSAPP_STATUS_COLORS,
  chatStatusLabelKey,
} from '../../utils/whatsappConversationStatus';

export type ConversationRow = {
  client: any;
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
  status?: string;
  snoozedUntil?: string | null;
  isStarred?: boolean;
  isUnsubscribed?: boolean;
  assignedToId?: number | null;
  assignedToInitials?: string;
};

export type ConversationListAction =
  | { type: 'status'; status: string }
  | { type: 'snooze'; snoozedUntil: string }
  | { type: 'star'; starred: boolean }
  | { type: 'unsubscribe'; unsubscribed: boolean }
  | { type: 'delete' };

type Props = {
  conversations: ConversationRow[];
  selectedId?: string | number | null;
  onSelect: (client: any) => void;
  onStartNew: () => void;
  onDeleteConversation?: (client: any) => void;
  onConversationAction?: (client: any, action: ConversationListAction) => void;
  search: string;
  onSearchChange: (value: string) => void;
  unreplied: boolean;
  onUnrepliedChange: (value: boolean) => void;
  t: (key: keyof typeof translations.en) => string;
  language: string;
  /** Total matching conversations from API (not just loaded pages). */
  totalCount?: number;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
};

function formatListTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(
      language === 'ar' ? ARABIC_DATE_LOCALE : 'en-US',
      withLatinDigits({
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
  } catch {
    return '';
  }
}

function snoozeUntilIso(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function snoozeTomorrowMorningIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export const ConversationList: React.FC<Props> = ({
  conversations,
  selectedId,
  onSelect,
  onStartNew,
  onDeleteConversation,
  onConversationAction,
  search,
  onSearchChange,
  unreplied,
  onUnrepliedChange,
  t,
  language,
  totalCount,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}) => {
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [submenu, setSubmenu] = useState<'status' | 'snooze' | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!menuForId) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuForId(null);
        setSubmenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuForId]);

  const statuses = ['open', 'pending', 'spam', 'invalid', 'done'] as const;
  const shown = conversations.length;
  const total = typeof totalCount === 'number' ? totalCount : shown;
  const showCountFooter = total > 0 && (shown < total || hasMore);

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el || !hasMore || isFetchingMore || !onLoadMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      onLoadMore();
    }
  };

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col border-e border-gray-200 dark:border-gray-800 md:w-80 lg:w-96 ${WA_LIST_BG}`}
    >
      <div className={WA_HEADER_BAR}>
        <Button
          className="!h-9 w-full !gap-2 !rounded-lg !border-0 !bg-white !px-3 !py-1.5 !text-sm !font-semibold !text-primary shadow-sm hover:!bg-white/95 focus:!ring-white/50 focus:!ring-offset-primary dark:!border dark:!border-white/25 dark:!bg-white/10 dark:!text-white dark:!shadow-none dark:hover:!border-white/40 dark:hover:!bg-white/20 dark:focus:!ring-white/30 dark:focus:!ring-offset-0"
          onClick={onStartNew}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 dark:bg-white/15">
            <PlusIcon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{t('startNewConversation')}</span>
        </Button>
      </div>
      <div className="shrink-0 space-y-2 p-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              role="switch"
              checked={unreplied}
              onChange={(e) => onUnrepliedChange(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition ${
                unreplied ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                  unreplied ? 'start-4' : 'start-0.5'
                }`}
              />
            </span>
            {t('chatFilterUnreplied')}
          </label>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('searchConversations')}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 ps-8 pe-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>
      <ul
        ref={listRef}
        onScroll={handleListScroll}
        className="min-h-0 flex-1 overflow-y-auto custom-scrollbar"
      >
        {conversations.map((row) => {
          const {
            client,
            lastMessagePreview,
            lastMessageAt,
            unreadCount = 0,
            status = 'open',
            isStarred,
            assignedToInitials,
          } = row;
          const id = String(client.id);
          const active = selectedId != null && String(selectedId) === id;
          const hasUnread = !active && unreadCount > 0;
          const title = getWhatsAppContactTitle(client);
          const rawPreview = lastMessagePreview || getWhatsAppContactSubtitle(client) || '';
          const subtitle = lastMessagePreview
            ? localizeWhatsAppMessageBody(lastMessagePreview, t)
            : rawPreview;
          const isSnoozed = status === 'snoozed';
          const menuOpen = menuForId === id;

          return (
            <li key={id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(client)}
                className={`flex w-full items-center gap-3 border-b border-black/5 px-3 py-3 pe-10 text-start dark:border-white/5 ${
                  active ? WA_LIST_ACTIVE : WA_LIST_HOVER
                }`}
              >
                <div className="relative shrink-0">
                  <div className={WA_AVATAR}>{getWhatsAppContactAvatarLabel(client)}</div>
                  {assignedToInitials ? (
                    <span className="absolute -bottom-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-700 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                      {assignedToInitials}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      {isStarred ? (
                        <StarIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      ) : null}
                      {isPhoneLike(title) ? (
                        <PhoneText
                          as="p"
                          className={`truncate text-gray-900 dark:text-white ${
                            hasUnread ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {title}
                        </PhoneText>
                      ) : (
                        <p
                          className={`truncate text-gray-900 dark:text-white ${
                            hasUnread ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {title}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 text-[10px] ${
                        hasUnread
                          ? 'font-semibold text-primary dark:text-primary-300'
                          : 'text-gray-500'
                      }`}
                    >
                      {isSnoozed ? (
                        <ClockIcon className="h-3 w-3 text-amber-500" />
                      ) : null}
                      {formatListTime(lastMessageAt, language)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {subtitle ? (
                        isPhoneLike(subtitle) ? (
                          <PhoneText
                            className={`block truncate text-xs ${
                              hasUnread
                                ? 'font-semibold text-gray-700 dark:text-gray-200'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {subtitle}
                          </PhoneText>
                        ) : (
                          <p
                            className={`truncate text-xs ${
                              hasUnread
                                ? 'font-semibold text-gray-700 dark:text-gray-200'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {subtitle}
                          </p>
                        )
                      ) : null}
                    </div>
                    {status && status !== 'open' ? (
                      <LeadStatusBadge
                        name={t(chatStatusLabelKey(status) as keyof typeof translations.en)}
                        color={WHATSAPP_STATUS_COLORS[status] || '#94a3b8'}
                        size="sm"
                        className="!min-w-0 !px-1.5 !py-0.5 !text-[10px]"
                      />
                    ) : null}
                    {hasUnread ? (
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
              {onConversationAction && (
                <div className="absolute end-1 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    className="rounded p-1 text-gray-400 opacity-0 hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    aria-label={t('chatConversationActions')}
                    title={t('chatConversationActions')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuForId(menuOpen ? null : id);
                      setSubmenu(null);
                    }}
                  >
                    <MoreVerticalIcon className="h-4 w-4" />
                  </button>
                  {menuOpen ? (
                    <div
                      ref={menuRef}
                      className="absolute end-0 top-full z-30 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!submenu ? (
                        <>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setSubmenu('status')}
                          >
                            {t('chatSetStatus')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => setSubmenu('snooze')}
                          >
                            {t('chatSnoozeUntil')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              onConversationAction(client, {
                                type: 'star',
                                starred: !isStarred,
                              });
                              setMenuForId(null);
                            }}
                          >
                            {isStarred ? t('chatUnstar') : t('chatStar')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              onConversationAction(client, {
                                type: 'unsubscribe',
                                unsubscribed: !row.isUnsubscribed,
                              });
                              setMenuForId(null);
                            }}
                          >
                            {row.isUnsubscribed
                              ? t('chatResubscribe')
                              : t('chatMarkUnsubscribed')}
                          </button>
                          {onDeleteConversation ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              onClick={() => {
                                onDeleteConversation(client);
                                setMenuForId(null);
                              }}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              {t('delete')}
                            </button>
                          ) : null}
                        </>
                      ) : null}
                      {submenu === 'status' ? (
                        <>
                          {statuses.map((st) => (
                            <button
                              key={st}
                              type="button"
                              className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={() => {
                                onConversationAction(client, { type: 'status', status: st });
                                setMenuForId(null);
                                setSubmenu(null);
                              }}
                            >
                              {t(chatStatusLabelKey(st) as keyof typeof translations.en)}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start text-gray-500"
                            onClick={() => setSubmenu(null)}
                          >
                            {t('back')}
                          </button>
                        </>
                      ) : null}
                      {submenu === 'snooze' ? (
                        <>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              onConversationAction(client, {
                                type: 'snooze',
                                snoozedUntil: snoozeUntilIso(1),
                              });
                              setMenuForId(null);
                            }}
                          >
                            {t('chatSnooze1h')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              onConversationAction(client, {
                                type: 'snooze',
                                snoozedUntil: snoozeUntilIso(3),
                              });
                              setMenuForId(null);
                            }}
                          >
                            {t('chatSnooze3h')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => {
                              onConversationAction(client, {
                                type: 'snooze',
                                snoozedUntil: snoozeTomorrowMorningIso(),
                              });
                              setMenuForId(null);
                            }}
                          >
                            {t('chatSnoozeTomorrow')}
                          </button>
                          <button
                            type="button"
                            className="block w-full px-3 py-1.5 text-start text-gray-500"
                            onClick={() => setSubmenu(null)}
                          >
                            {t('back')}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
        {conversations.length === 0 && (
          <li className="p-6 text-center text-sm text-gray-500">
            {t('noConversations')}
          </li>
        )}
        {showCountFooter && (
          <li className="flex flex-col items-center gap-2 border-t border-black/5 px-3 py-3 dark:border-white/5">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('messageLogShowingCount')
                .replace('{shown}', String(shown))
                .replace('{total}', String(total))}
            </p>
            {hasMore && (
              <Button
                type="button"
                variant="secondary"
                className="!h-8 !px-3 !text-xs"
                onClick={() => onLoadMore?.()}
                disabled={isFetchingMore}
              >
                {isFetchingMore ? (
                  <>
                    <Loader size="sm" variant="primary" className="me-2" />
                    {t('loading')}
                  </>
                ) : (
                  t('messageLogLoadMore')
                )}
              </Button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
};
