import React, { useRef, useState } from 'react';

import { translations } from '../../constants';
import { ChatMediaThumb } from '../chat/ChatMediaThumb';
import { ChatPendingAttachmentChip } from '../chat/ChatPendingAttachmentChip';
import { ChatVoiceRecordingBar } from '../chat/ChatVoiceRecordingBar';
import { MicrophoneIcon, PaperclipIcon, SendPlaneIcon } from '../icons';
import { useChatVoiceRecorder } from '../../hooks/useChatVoiceRecorder';
import type { SupportChatMessage } from '../../services/api';

type Props = {
  t: (key: keyof typeof translations.en) => string;
  disabled?: boolean;
  replyTo: SupportChatMessage | null;
  onCancelReply: () => void;
  onSend: (payload: { body: string; file?: File }) => Promise<void>;
  onOpenPending?: (file: File, previewUrl: string, kind: 'image' | 'video') => void;
  compact?: boolean;
};

function supportReplySnippet(
  message: SupportChatMessage,
  t: (key: keyof typeof translations.en) => string
): string {
  const cap = (message.body || '').replace(/\s+/g, ' ').trim();
  const kind = message.attachment_kind;
  let label = '';
  if (kind === 'image') label = t('teamChatMediaPhoto');
  else if (kind === 'video') label = t('teamChatMediaVideo');
  else if (kind === 'audio') label = t('teamChatMediaAudio');
  else if (kind === 'document') label = t('teamChatMediaDocument');
  if (label && cap) return `${label} · ${cap}`;
  if (cap) return cap;
  return label;
}

const iconBtnClass =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800';

export const SupportComposer: React.FC<Props> = ({
  t,
  disabled,
  replyTo,
  onCancelReply,
  onSend,
  onOpenPending,
  compact = false,
}) => {
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const voice = useChatVoiceRecorder({
    enabled: !disabled && !sending,
    busy: sending,
    onRecordingComplete: (file) => setPendingFile(file),
    micDeniedKey: 'teamChatMicDenied',
  });

  const handleSend = async () => {
    const body = text.trim();
    if (!body && !pendingFile) return;
    setSending(true);
    try {
      await onSend({ body, file: pendingFile ?? undefined });
      setText('');
      setPendingFile(null);
      onCancelReply();
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(text.trim() || pendingFile);

  return (
    <div
      className={`border-t border-gray-200/80 dark:border-gray-700/80 space-y-2 shrink-0 ${
        compact ? 'p-2 bg-white/90 dark:bg-gray-900/90' : 'p-3 bg-white dark:bg-gray-900'
      }`}
    >
      {replyTo ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/[0.08] px-3 py-2 dark:border-primary/50 dark:bg-primary/25">
          {replyTo.attachment_url &&
          (replyTo.attachment_kind === 'image' || replyTo.attachment_kind === 'video') ? (
            <div className="size-11 shrink-0 overflow-hidden rounded-lg">
              <ChatMediaThumb
                url={replyTo.attachment_url}
                kind={replyTo.attachment_kind}
                className="size-full"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-200">
              {t('supportChatReplyingTo')}
            </p>
            <p className="truncate text-sm text-gray-800 dark:text-gray-50">
              <span>{replyTo.display_name}</span>
              {supportReplySnippet(replyTo, t) ? (
                <>
                  <span className="text-gray-500 dark:text-gray-300"> · </span>
                  <span>{supportReplySnippet(replyTo, t)}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
            aria-label={t('supportChatCancelReply')}
          >
            ×
          </button>
        </div>
      ) : null}
      {pendingFile ? (
        <ChatPendingAttachmentChip
          file={pendingFile}
          onClear={() => setPendingFile(null)}
          clearAriaLabel={t('teamChatClearAttachment')}
          openAriaLabel={t('chatMediaOpenAria')}
          onOpen={
            onOpenPending
              ? (previewUrl, kind) => onOpenPending(pendingFile, previewUrl, kind)
              : undefined
          }
        />
      ) : null}
      {voice.voiceRecording ? (
        <ChatVoiceRecordingBar
          elapsedLabel={voice.elapsedLabel}
          paused={voice.voicePaused}
          onPause={voice.pauseVoiceRecording}
          onResume={voice.resumeVoiceRecording}
          onStop={voice.stopVoiceRecording}
          onCancel={voice.cancelVoiceRecording}
          t={t}
          variant="team"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={compact ? 1 : 2}
            disabled={disabled || sending}
            placeholder={t('supportChatSendPlaceholder')}
            className={`flex-1 min-w-0 resize-none rounded-xl border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/80 ${
              compact
                ? 'h-10 max-h-24 py-2 px-3 text-sm leading-5'
                : 'min-h-[2.75rem] max-h-28 py-2 px-3 text-sm leading-5'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPendingFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => fileRef.current?.click()}
            className={iconBtnClass}
            aria-label="Attach file"
          >
            <PaperclipIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled || sending}
            onClick={() => voice.startVoiceRecording()}
            className={iconBtnClass}
            aria-label="Voice note"
          >
            <MicrophoneIcon className="h-[1.125rem] w-[1.125rem]" />
          </button>
          <button
            type="button"
            disabled={disabled || sending || !canSend}
            onClick={() => void handleSend()}
            aria-label={t('send')}
            title={t('send')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/25 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
          >
            <SendPlaneIcon className="h-[1.125rem] w-[1.125rem] rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
};
