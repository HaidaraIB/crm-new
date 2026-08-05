import React from 'react';

export type ChatStatusVariant = 'started' | 'day' | 'new';

type Props = {
  variant: ChatStatusVariant;
  label: string;
};

/**
 * WhatsApp-style centered status / system rows (conversation started, day chip, new messages).
 */
export const ChatStatusSeparator: React.FC<Props> = ({ variant, label }) => {
  if (variant === 'new') {
    return (
      <div className="flex items-center gap-3 py-2" role="separator" aria-label={label}>
        <div className="h-px flex-1 bg-sky-300/80 dark:bg-sky-500/40" />
        <span className="shrink-0 text-xs font-semibold tracking-wide text-sky-600 dark:text-sky-400">
          {label}
        </span>
        <div className="h-px flex-1 bg-sky-300/80 dark:bg-sky-500/40" />
      </div>
    );
  }

  if (variant === 'day') {
    return (
      <div className="flex justify-center py-2" role="separator" aria-label={label}>
        <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm ring-1 ring-black/5 dark:bg-gray-800/90 dark:text-gray-300 dark:ring-white/10">
          {label}
        </span>
      </div>
    );
  }

  // conversation started
  return (
    <div className="flex justify-center py-2" role="status">
      <span className="text-center text-[11px] italic text-gray-500 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
};
