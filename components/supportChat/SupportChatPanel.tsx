import React, { useEffect, useRef } from 'react';

import { useAppContext } from '../../context/AppContext';
import { XIcon } from '../icons';
import { SupportChatThread } from './SupportChatThread';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Viewport position so the card opens beside the dragged button. */
  anchor?: { top: number; left: number } | null;
};

/**
 * Floating support card — no backdrop; the CRM stays fully usable behind it.
 */
export const SupportChatPanel: React.FC<Props> = ({ open, onClose, anchor = null }) => {
  const { t } = useAppContext();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={t('supportChatTitle')}
      style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
      className={`fixed z-50 w-[min(100vw-2rem,24rem)] h-[min(76vh,27rem)] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-600/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.45)] ${
        anchor ? '' : 'end-4 sm:end-6 bottom-[5.75rem]'
      }`}
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-gray-200/80 dark:border-gray-700/80 px-3 py-2.5 bg-gradient-to-b from-gray-50/90 to-white/90 dark:from-gray-800/90 dark:to-gray-900/90">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shadow-sm">
          L
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {t('supportChatTitle')}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
            {t('supportChatWidgetSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 dark:text-gray-300"
          aria-label={t('supportChatClose')}
        >
          <XIcon className="h-4 w-4" />
        </button>
      </header>
      <SupportChatThread variant="widget" className="min-h-0 flex-1 border-0 rounded-none max-h-none bg-transparent" enabled={open} />
    </div>
  );
};
