import React, { useMemo, useState } from 'react';
import { Button, PhoneText, isPhoneLike, PlusIcon } from '../index';
import { SearchIcon } from '../icons';
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
import { localizeWhatsAppMessageBody } from '../../utils/whatsappMessageBodyDisplay';

export type ConversationRow = {
  client: any;
  lastMessagePreview?: string;
  lastMessageAt?: string | null;
};

type Props = {
  conversations: ConversationRow[];
  selectedId?: string | number | null;
  onSelect: (client: any) => void;
  onStartNew: () => void;
  onDeleteConversation?: (client: any) => void;
  t: (key: keyof typeof translations.en) => string;
  language: string;
};

function formatListTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(language === 'ar' ? 'ar' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export const ConversationList: React.FC<Props> = ({
  conversations,
  selectedId,
  onSelect,
  onStartNew,
  onDeleteConversation,
  t,
  language,
}) => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter(({ client }) => {
      const title = getWhatsAppContactTitle(client).toLowerCase();
      const sub = (getWhatsAppContactSubtitle(client) || '').toLowerCase();
      const phone = String(client.phone_number || '').toLowerCase();
      return title.includes(needle) || sub.includes(needle) || phone.includes(needle);
    });
  }, [conversations, q]);

  return (
    <div className={`flex h-full min-h-0 w-full flex-col border-e border-gray-200 dark:border-gray-800 md:w-80 lg:w-96 ${WA_LIST_BG}`}>
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
      <div className="shrink-0 p-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchConversations')}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 ps-8 pe-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {filtered.map(({ client, lastMessagePreview, lastMessageAt }) => {
          const id = client.id;
          const active = selectedId != null && String(selectedId) === String(id);
          const title = getWhatsAppContactTitle(client);
          const rawPreview = lastMessagePreview || getWhatsAppContactSubtitle(client) || '';
          const subtitle = lastMessagePreview
            ? localizeWhatsAppMessageBody(lastMessagePreview, t)
            : rawPreview;
          return (
            <li key={String(id)} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(client)}
                className={`w-full flex items-center gap-3 px-3 py-3 pe-10 text-start border-b border-black/5 dark:border-white/5 ${
                  active ? WA_LIST_ACTIVE : WA_LIST_HOVER
                }`}
              >
                <div className={WA_AVATAR}>{getWhatsAppContactAvatarLabel(client)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    {isPhoneLike(title) ? (
                      <PhoneText as="p" className="font-medium text-gray-900 dark:text-white truncate">
                        {title}
                      </PhoneText>
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
                    )}
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {formatListTime(lastMessageAt, language)}
                    </span>
                  </div>
                  {subtitle ? (
                    isPhoneLike(subtitle) ? (
                      <PhoneText className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                        {subtitle}
                      </PhoneText>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
                    )
                  ) : null}
                </div>
              </button>
              {onDeleteConversation && (
                <button
                  type="button"
                  className="absolute end-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1"
                  aria-label={t('delete') || 'Delete'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(client);
                  }}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="p-6 text-center text-sm text-gray-500">{t('noConversations') || 'No conversations'}</li>
        )}
      </ul>
    </div>
  );
};
