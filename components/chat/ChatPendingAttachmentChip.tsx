import React from 'react';
import { PaperclipIcon } from '../icons';

type Props = {
  file: File;
  onClear: () => void;
  clearAriaLabel: string;
};

export const ChatPendingAttachmentChip: React.FC<Props> = ({
  file,
  onClear,
  clearAriaLabel,
}) => (
  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90">
    <PaperclipIcon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
    <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-100">{file.name}</span>
    <button
      type="button"
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-black/10 dark:text-gray-400 dark:hover:bg-white/10"
      onClick={onClear}
      aria-label={clearAriaLabel}
    >
      ×
    </button>
  </div>
);
