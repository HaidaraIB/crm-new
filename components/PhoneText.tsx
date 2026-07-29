import React from 'react';

/** BiDi/number styling shared by phone displays (no display/layout mode). */
export const PHONE_BIDI_CLASS = 'tabular-nums tracking-tight [unicode-bidi:isolate]';

/** Full class set for a standalone phone text island (`PhoneText`). */
export const PHONE_TEXT_CLASS = `inline-block ${PHONE_BIDI_CLASS}`;

type PhoneTextTag = 'span' | 'p' | 'div' | 'td' | 'dd' | 'strong';

type PhoneTextProps = {
  children: React.ReactNode;
  className?: string;
  as?: PhoneTextTag;
  title?: string;
};

/**
 * Renders a phone number as an LTR BiDi island so leading `+` / country codes
 * stay correct under document RTL (Arabic).
 */
export function PhoneText({
  children,
  className = '',
  as: Tag = 'span',
  title,
}: PhoneTextProps) {
  if (children == null || children === '') return null;
  return (
    <Tag
      dir="ltr"
      className={`${PHONE_TEXT_CLASS}${className ? ` ${className}` : ''}`}
      title={title}
    >
      {children}
    </Tag>
  );
}

/**
 * True when a display string is likely a phone (leading `+`, or mostly digits/separators).
 * Use for ambiguous titles such as WhatsApp account.name or contact titles.
 */
export function isPhoneLike(value: string | null | undefined): boolean {
  const s = String(value ?? '').trim();
  if (!s) return false;
  if (s.startsWith('+')) return true;
  const stripped = s.replace(/[\s\-().]/g, '');
  return /^\d{6,}$/.test(stripped);
}
