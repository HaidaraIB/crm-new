import React from 'react';
import {
  MESSAGE_PLACEHOLDER_CHIPS,
  LEGACY_TEMPLATE_PLACEHOLDER_CHIPS,
  type PlaceholderChip,
} from '../utils/messagePlaceholders';

type TranslateFn = (key: string) => string;

type MessagePlaceholderChipsProps = {
  t: TranslateFn;
  language: string;
  onInsert: (token: string) => void;
  /** Include Amount / Invoice Number chips (WhatsApp template editor). */
  includeLegacy?: boolean;
  /** Trailing `</>` hint shown in the Messaging Center template body editor. */
  showCodeHint?: boolean;
  className?: string;
};

/** Insert `token` at the textarea caret (or append if no selection). */
export function insertTextAtCaret(
  value: string,
  token: string,
  el: HTMLTextAreaElement | HTMLInputElement | null
): { next: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
  return { next, caret: start + token.length };
}

function chipLabel(chip: PlaceholderChip, t: TranslateFn, language: string): string {
  const translated = t(chip.key);
  if (translated && translated !== chip.key) return translated;
  return language === 'ar' ? chip.insertAr : chip.insertEn;
}

/**
 * Clickable placeholder tags for SMS / WhatsApp template editors.
 * Inserts language-appropriate `{ … }` tokens via `onInsert`.
 */
export const MessagePlaceholderChips = ({
  t,
  language,
  onInsert,
  includeLegacy = false,
  showCodeHint = false,
  className = '',
}: MessagePlaceholderChipsProps) => {
  const chips = includeLegacy
    ? [...MESSAGE_PLACEHOLDER_CHIPS, ...LEGACY_TEMPLATE_PLACEHOLDER_CHIPS]
    : MESSAGE_PLACEHOLDER_CHIPS;

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const insert = language === 'ar' ? chip.insertAr : chip.insertEn;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onInsert(insert)}
              title={insert}
              className="inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-800 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200 dark:hover:bg-primary-900/60"
            >
              {chipLabel(chip, t, language)}
            </button>
          );
        })}
        {showCodeHint ? (
          <span
            className="inline-flex items-center text-gray-400 dark:text-gray-500 text-sm"
            title={t('messageContent')}
          >
            &lt;/&gt;
          </span>
        ) : null}
      </div>
    </div>
  );
};
