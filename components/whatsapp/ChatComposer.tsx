import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Loader } from '../index';
import { MicrophoneIcon, PaperclipIcon } from '../icons';
import { ChatPendingAttachmentChip } from '../chat/ChatPendingAttachmentChip';
import { ChatVoiceRecordingBar } from '../chat/ChatVoiceRecordingBar';
import { useChatVoiceRecorder } from '../../hooks/useChatVoiceRecorder';
import { useAppContext } from '../../context/AppContext';
import { translations } from '../../constants';
import { WA_ALERT_ERROR, WA_ALERT_INFO, WA_ALERT_WARN, WA_COMPOSER_BG, WA_INPUT_SHELL, WA_SEND_BTN } from './whatsappChatTheme';
import type { MessageTemplateType } from '../../services/api';

export type SessionInfo = {
  in_session: boolean;
  hours_remaining?: number | null;
  last_inbound_at?: string | null;
} | null;

type Props = {
  t: (key: keyof typeof translations.en) => string;
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
  pendingAttachment: File | null;
  setPendingAttachment: (file: File | null) => void;
  pendingIsVoiceNote?: boolean;
  setPendingIsVoiceNote?: (v: boolean) => void;
  compressingAttachment?: boolean;
  onOpenPendingMedia?: (previewUrl: string, kind: 'image' | 'video') => void;
};

const COMPOSER_MIN_H_PX = 32;
const COMPOSER_MAX_H_PX = 160;

/** Caret/base direction from UI language when empty, else first strong letter (ar → rtl, en → ltr). */
function composerTextDir(text: string, uiIsRtl: boolean): 'ltr' | 'rtl' {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code == null) continue;
    if (
      (code >= 0x0590 && code <= 0x08ff) ||
      (code >= 0xfb1d && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfeff)
    ) {
      return 'rtl';
    }
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0xc0 && code <= 0x24f)
    ) {
      return 'ltr';
    }
  }
  return uiIsRtl ? 'rtl' : 'ltr';
}

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
  pendingAttachment,
  setPendingAttachment,
  setPendingIsVoiceNote,
  compressingAttachment = false,
  onOpenPendingMedia,
}) => {
  const { language } = useAppContext();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const freeTextDisabled = whatsappSendBlocked || blockFreeText;
  const [showTemplates, setShowTemplates] = useState(false);
  const isRtl = language === 'ar';
  const textDir = composerTextDir(messageInput, isRtl);
  const canSend = Boolean(messageInput.trim() || pendingAttachment);
  const showMic = !canSend;

  const {
    voiceRecording,
    voicePaused,
    elapsedLabel,
    startVoiceRecording,
    stopVoiceRecording,
    pauseVoiceRecording,
    resumeVoiceRecording,
    cancelVoiceRecording,
  } = useChatVoiceRecorder({
    enabled: !freeTextDisabled,
    busy: freeTextDisabled || compressingAttachment,
    onRecordingComplete: (file) => {
      setPendingAttachment(file);
      setPendingIsVoiceNote?.(true);
    },
    onError: (key) => setMicError(t(key) || key),
  });

  const resizeComposer = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_H_PX), COMPOSER_MAX_H_PX);
    el.style.height = `${next}px`;
  };

  useLayoutEffect(() => {
    resizeComposer();
  }, [messageInput]);

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

      {pendingAttachment ? (
        <ChatPendingAttachmentChip
          file={pendingAttachment}
          onClear={() => {
            setPendingAttachment(null);
            setPendingIsVoiceNote?.(false);
          }}
          clearAriaLabel={t('teamChatClearAttachment')}
          openAriaLabel={t('chatMediaOpenAria')}
          onOpen={onOpenPendingMedia}
        />
      ) : null}
      {compressingAttachment ? (
        <p className="px-0.5 text-[10px] text-gray-500 dark:text-gray-400">
          {t('teamChatCompressing')}
        </p>
      ) : null}
      {micError ? <p className="px-0.5 text-[10px] text-red-600 dark:text-red-400">{micError}</p> : null}

      {/* dir=ltr keeps attach | input | action spacing stable under Arabic page RTL */}
      <div className="flex w-full min-w-0 items-center gap-2" dir="ltr">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setPendingAttachment(f);
              setPendingIsVoiceNote?.(false);
            }
            e.target.value = '';
          }}
        />
        <div
          className={`${WA_INPUT_SHELL} flex min-h-11 min-w-0 flex-1 items-center gap-0.5 rounded-3xl py-1.5 ${
            voiceRecording ? 'ring-1 ring-red-400/40 border-red-400/50' : ''
          }`}
        >
          {voiceRecording ? (
            <ChatVoiceRecordingBar
              variant="whatsapp"
              elapsedLabel={elapsedLabel}
              paused={voicePaused}
              onPause={pauseVoiceRecording}
              onResume={resumeVoiceRecording}
              onStop={stopVoiceRecording}
              onCancel={cancelVoiceRecording}
              t={t}
            />
          ) : (
            <>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/10"
                disabled={freeTextDisabled || compressingAttachment}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('teamChatAttach')}
                title={t('teamChatAttach')}
              >
                <PaperclipIcon className="size-[1.2rem]" />
              </button>
              <textarea
                ref={textareaRef}
                rows={1}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                }}
                onInput={resizeComposer}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!freeTextDisabled && canSend) onSend();
                  }
                }}
                disabled={freeTextDisabled || compressingAttachment}
                placeholder={t('typeMessageWhatsApp')}
                dir={textDir}
                wrap="soft"
                className={`custom-scrollbar box-border min-h-0 min-w-0 flex-1 resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-5 text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-gray-100 [overflow-wrap:anywhere] whitespace-pre-wrap ${
                  textDir === 'rtl' ? 'text-right' : 'text-left'
                }`}
                style={{ height: COMPOSER_MIN_H_PX, minHeight: COMPOSER_MIN_H_PX, maxHeight: COMPOSER_MAX_H_PX }}
              />
            </>
          )}
        </div>
        {voiceRecording ? null : showMic ? (
          <button
            type="button"
            className={`inline-flex shrink-0 items-center justify-center self-center ${WA_SEND_BTN}`}
            disabled={freeTextDisabled || compressingAttachment}
            onClick={() => {
              setMicError(null);
              void startVoiceRecording();
            }}
            aria-label={t('teamChatRecordVoice')}
          >
            <MicrophoneIcon className="h-5 w-5 text-white" />
          </button>
        ) : (
          <Button
            className={`${WA_SEND_BTN} !self-center`}
            disabled={freeTextDisabled || !canSend || compressingAttachment}
            onClick={onSend}
            aria-label={t('send')}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="currentColor"
              aria-hidden
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
};
