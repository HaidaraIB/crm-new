import React, { useEffect, useState } from 'react';
import { PaperclipIcon, PlayIcon } from '../icons';

type Props = {
  file: File;
  onClear: () => void;
  clearAriaLabel: string;
  /** Open image/video in the media viewer. */
  onOpen?: (previewUrl: string, kind: 'image' | 'video') => void;
  openAriaLabel?: string;
};

export const ChatPendingAttachmentChip: React.FC<Props> = ({
  file,
  onClear,
  clearAriaLabel,
  onOpen,
  openAriaLabel,
}) => {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage && !isVideo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage, isVideo]);

  const canOpen = Boolean(onOpen && previewUrl && (isImage || isVideo));

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-gray-500 dark:bg-gray-800">
      {previewUrl ? (
        <button
          type="button"
          disabled={!canOpen}
          className={`relative size-11 shrink-0 overflow-hidden rounded-lg bg-black/30 ${
            canOpen ? 'cursor-zoom-in outline-none ring-primary/40 focus-visible:ring-2' : ''
          }`}
          onClick={() => {
            if (!canOpen || !previewUrl) return;
            onOpen?.(previewUrl, isVideo ? 'video' : 'image');
          }}
          aria-label={openAriaLabel || clearAriaLabel}
        >
          {isImage ? (
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <video
                src={previewUrl}
                muted
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <PlayIcon className="size-3.5 text-white" aria-hidden />
              </span>
            </>
          )}
        </button>
      ) : (
        <PaperclipIcon
          className="size-4 shrink-0 text-gray-600 dark:text-gray-200"
          aria-hidden
        />
      )}
      {canOpen ? (
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-start font-medium text-gray-900 outline-none hover:underline dark:text-gray-50"
          onClick={() => {
            if (!previewUrl) return;
            onOpen?.(previewUrl, isVideo ? 'video' : 'image');
          }}
        >
          {file.name}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-gray-50">
          {file.name}
        </span>
      )}
      <button
        type="button"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-black/10 dark:text-gray-200 dark:hover:bg-white/10"
        onClick={onClear}
        aria-label={clearAriaLabel}
      >
        ×
      </button>
    </div>
  );
};
