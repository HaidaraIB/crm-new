import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Loader } from '../index';
import {
  WhatsAppFormatToolbar,
  applyWhatsAppFormatToInput,
  textLooksWhatsAppFormatted,
  WhatsAppFormattedText,
  type WhatsAppFormatKind,
} from '../../utils/whatsappFormatting';
import { WA_ALERT_ERROR, WA_ALERT_INFO, WA_ALERT_WARN, WA_COMPOSER_BG, WA_INPUT_SHELL, WA_SEND_BTN } from './whatsappChatTheme';
import type { MessageTemplateType } from '../../services/api';

export type SessionInfo = {
  in_session: boolean;
  hours_remaining?: number | null;
  last_inbound_at?: string | null;
} | null;

type Props = {
  t: (key: string) => string;
  messageInput: string;
  setMessageInput: (v: string) => void;
  onSend: () => void;
  whatsappSendBlocked: boolean;
  blockFreeText: boolean;
  approvedTemplates: MessageTemplateType[];
  chatTemplateSendId: number | '';
  setChatTemplateSendId: (v: number | '') => void;
  onSendTemplate: () => void;
  chatTemplateSending: boolean;
  session: SessionInfo;
  displayNameBlockedHint?: string | null;
  composerAlert?: { variant: 'error' | 'warning' | 'info'; message: string } | null;
  onInsertQuickTemplate: (content: string, templateId?: number) => void;
};

export const ChatComposer: React.FC<Props> = ({
  t,
  messageInput,
  setMessageInput,
  onSend,
  whatsappSendBlocked,
  blockFreeText,
  approvedTemplates,
  chatTemplateSendId,
  setChatTemplateSendId,
  onSendTemplate,
  chatTemplateSending,
  session,
  displayNameBlockedHint,
  composerAlert,
  onInsertQuickTemplate,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const freeTextDisabled = whatsappSendBlocked || blockFreeText;
  const [showTemplates, setShowTemplates] = useState(false);

  const applyFormat = (kind: WhatsAppFormatKind) => {
    const el = textareaRef.current;
    if (!el) return;
    const { next, selectionStart, selectionEnd } = applyWhatsAppFormatToInput(
      messageInput,
      el.selectionStart,
      el.selectionEnd,
      kind
    );
    setMessageInput(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, [messageInput]);

  // Auto-expand templates panel when free-text is blocked (session closed).
  useEffect(() => {
    if (blockFreeText && !whatsappSendBlocked) setShowTemplates(true);
  }, [blockFreeText, whatsappSendBlocked]);

  const quickTemplates = useMemo(() => approvedTemplates.slice(0, 6), [approvedTemplates]);

  const alertNode = whatsappSendBlocked ? (
    <div className={WA_ALERT_WARN}>
      {t('whatsappReconnectRequired') || 'WhatsApp is disconnected. Reconnect an account to send messages.'}
    </div>
  ) : displayNameBlockedHint ? (
    <div className={WA_ALERT_ERROR}>{displayNameBlockedHint}</div>
  ) : composerAlert ? (
    <div
      className={
        composerAlert.variant === 'error'
          ? WA_ALERT_ERROR
          : composerAlert.variant === 'warning'
            ? WA_ALERT_WARN
            : WA_ALERT_INFO
      }
    >
      {composerAlert.message}
    </div>
  ) : blockFreeText ? (
    <div className={WA_ALERT_WARN}>
      {t('whatsappSessionClosedHint') ||
        'No customer message in the last 24 hours (CRM records). Use an approved Meta template below.'}
    </div>
  ) : null;

  return (
    <div className={`${WA_COMPOSER_BG} space-y-1.5 px-2 py-1.5 sm:px-3`}>
      {alertNode}

      {!blockFreeText && session?.in_session && session.hours_remaining != null && (
        <p className="px-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          {(t('whatsappSessionOpenHint') || 'Free-form messages allowed (~{h}h left in session)').replace(
            '{h}',
            String(Math.max(0, Math.round(session.hours_remaining * 10) / 10))
          )}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          disabled={whatsappSendBlocked}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
            showTemplates
              ? 'border-primary/40 bg-primary/10 text-primary dark:text-primary-200'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          {t('template') || 'Templates'}
        </button>
        {showTemplates && (
          <>
            <select
              value={chatTemplateSendId === '' ? '' : String(chatTemplateSendId)}
              onChange={(e) => setChatTemplateSendId(e.target.value ? Number(e.target.value) : '')}
              disabled={whatsappSendBlocked}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 sm:text-sm"
            >
              <option value="">{t('selectApprovedTemplate') || 'Choose an approved template...'}</option>
              {approvedTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="!shrink-0 !px-2 !py-1 !text-xs"
              disabled={whatsappSendBlocked || !chatTemplateSendId || chatTemplateSending}
              onClick={onSendTemplate}
            >
              {chatTemplateSending ? (
                <Loader variant="primary" className="h-3.5 w-3.5" />
              ) : (
                t('sendTemplateMessage') || 'Send template'
              )}
            </Button>
          </>
        )}
      </div>

      {showTemplates && quickTemplates.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
          {quickTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              disabled={freeTextDisabled}
              onClick={() => onInsertQuickTemplate(tpl.content || '', tpl.id)}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 disabled:opacity-50 hover:border-primary/40 hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-primary-200"
            >
              {tpl.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className={WA_INPUT_SHELL}>
          <WhatsAppFormatToolbar disabled={freeTextDisabled} onFormat={applyFormat} />
          <textarea
            ref={textareaRef}
            rows={1}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!freeTextDisabled && messageInput.trim()) onSend();
              }
            }}
            disabled={freeTextDisabled}
            placeholder={t('typeMessageWhatsApp')}
            className="max-h-[88px] min-h-[32px] w-full resize-none border-0 bg-transparent px-1 py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-gray-100"
          />
          {textLooksWhatsAppFormatted(messageInput) && (
            <div className="px-1 pb-1">
              <WhatsAppFormattedText
                text={messageInput}
                as="div"
                className="break-words whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100"
              />
            </div>
          )}
        </div>
        <Button
          className={WA_SEND_BTN}
          disabled={freeTextDisabled || !messageInput.trim()}
          onClick={onSend}
          aria-label={t('send') || 'Send'}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </Button>
      </div>
    </div>
  );
};
