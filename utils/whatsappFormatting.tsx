/**
 * Render WhatsApp-style text formatting for display.
 * Markers: *bold* _italic_ ~strikethrough~ ```monospace```
 * Also auto-links http(s) URLs.
 *
 * Compose/send formatting (toolbar → insert markers) is a follow-up.
 */
import React from 'react';

type InlineKind = 'bold' | 'italic' | 'strike';

const INLINE_RULES: Array<{ kind: InlineKind; re: RegExp }> = [
  // Non-greedy; WhatsApp disallows leading/trailing whitespace inside markers (validated after match).
  { kind: 'bold', re: /\*([^*\n]+?)\*/ },
  { kind: 'italic', re: /_([^_\n]+?)_/ },
  { kind: 'strike', re: /~([^~\n]+?)~/ },
];

const URL_RE = /https?:\/\/[^\s<>"']+/g;

function trimTrailingUrlPunctuation(url: string): { href: string; trailing: string } {
  let href = url;
  let trailing = '';
  while (href && /[),.!?;:]$/.test(href)) {
    trailing = href.slice(-1) + trailing;
    href = href.slice(0, -1);
  }
  return { href, trailing };
}

function linkifyPlain(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, 'g');
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const { href, trailing } = trimTrailingUrlPunctuation(m[0]);
    nodes.push(
      <a
        key={`${keyPrefix}-a-${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all opacity-95 hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {href}
      </a>
    );
    if (trailing) nodes.push(trailing);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function wrapInline(kind: InlineKind, children: React.ReactNode, key: string): React.ReactNode {
  if (kind === 'bold') return <strong key={key} className="font-semibold">{children}</strong>;
  if (kind === 'italic') return <em key={key}>{children}</em>;
  return (
    <span key={key} className="line-through opacity-90">
      {children}
    </span>
  );
}

/** Parse one non-code segment for * _ ~ and URLs. */
function parseInlineSegment(text: string, keyPrefix: string): React.ReactNode[] {
  if (!text) return [];

  let earliest: { index: number; length: number; kind: InlineKind; inner: string } | null = null;
  for (const rule of INLINE_RULES) {
    const re = new RegExp(rule.re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const inner = m[1];
      if (!inner || /^\s/.test(inner) || /\s$/.test(inner)) continue;
      if (!earliest || m.index < earliest.index) {
        earliest = { index: m.index, length: m[0].length, kind: rule.kind, inner };
      }
      break;
    }
  }

  if (!earliest) {
    return linkifyPlain(text, keyPrefix);
  }

  const nodes: React.ReactNode[] = [];
  if (earliest.index > 0) {
    nodes.push(...linkifyPlain(text.slice(0, earliest.index), `${keyPrefix}-pre`));
  }
  nodes.push(
    wrapInline(
      earliest.kind,
      parseInlineSegment(earliest.inner, `${keyPrefix}-in`),
      `${keyPrefix}-${earliest.kind}`
    )
  );
  const rest = text.slice(earliest.index + earliest.length);
  if (rest) {
    nodes.push(...parseInlineSegment(rest, `${keyPrefix}-rest`));
  }
  return nodes;
}

export function parseWhatsAppFormatting(text: string): React.ReactNode[] {
  if (!text) return [];
  // Split on ```monospace``` (WhatsApp); keep delimiters in the split result.
  const parts = text.split(/(```[\s\S]*?```)/g);
  const out: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (!part) return;
    if (part.startsWith('```') && part.endsWith('```') && part.length >= 6) {
      const code = part.slice(3, -3);
      out.push(
        <code
          key={`code-${idx}`}
          className="block my-1 rounded px-1.5 py-0.5 text-[0.85em] font-mono bg-black/10 dark:bg-black/30 whitespace-pre-wrap break-words"
        >
          {code}
        </code>
      );
      return;
    }
    out.push(...parseInlineSegment(part, `t${idx}`));
  });
  return out;
}

export function WhatsAppFormattedText({
  text,
  className,
  as: Tag = 'p',
}: {
  text: string;
  className?: string;
  as?: 'p' | 'span' | 'div';
}) {
  return <Tag className={className}>{parseWhatsAppFormatting(text || '')}</Tag>;
}

export type WhatsAppFormatKind = 'bold' | 'italic' | 'strike' | 'code';

const FORMAT_MARKERS: Record<WhatsAppFormatKind, { open: string; close: string; placeholder: string }> = {
  bold: { open: '*', close: '*', placeholder: 'bold' },
  italic: { open: '_', close: '_', placeholder: 'italic' },
  strike: { open: '~', close: '~', placeholder: 'strike' },
  code: { open: '```', close: '```', placeholder: 'code' },
};

/** Wrap a selection (or insert placeholders) with WhatsApp markers for Cloud API send. */
export function wrapWhatsAppSelection(
  value: string,
  start: number,
  end: number,
  kind: WhatsAppFormatKind
): { value: string; selectionStart: number; selectionEnd: number } {
  const safeStart = Math.max(0, Math.min(start, value.length));
  const safeEnd = Math.max(safeStart, Math.min(end, value.length));
  const { open, close, placeholder } = FORMAT_MARKERS[kind];
  const selected = value.slice(safeStart, safeEnd);
  const inner = selected || placeholder;
  const next = value.slice(0, safeStart) + open + inner + close + value.slice(safeEnd);
  const innerStart = safeStart + open.length;
  return {
    value: next,
    selectionStart: innerStart,
    selectionEnd: innerStart + inner.length,
  };
}

export function textLooksWhatsAppFormatted(text: string): boolean {
  const s = text || '';
  return (
    (s.includes('*') && /\*[^*\n]+\*/.test(s)) ||
    (s.includes('_') && /_[^_\n]+_/.test(s)) ||
    (s.includes('~') && /~[^~\n]+~/.test(s)) ||
    s.includes('```')
  );
}

type InputLike = HTMLInputElement | HTMLTextAreaElement;

/** Apply formatting around the current selection of an input/textarea and restore focus. */
export function applyWhatsAppFormatToInput(
  el: InputLike | null,
  value: string,
  kind: WhatsAppFormatKind,
  setValue: (next: string) => void
): void {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const result = wrapWhatsAppSelection(value, start, end, kind);
  setValue(result.value);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    } catch {
      /* ignore */
    }
  });
}

const TOOLBAR_BTN =
  'inline-flex h-7 min-w-7 items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed';

export function WhatsAppFormatToolbar({
  disabled,
  onFormat,
  className = '',
}: {
  disabled?: boolean;
  onFormat: (kind: WhatsAppFormatKind) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`.trim()} role="toolbar" aria-label="WhatsApp text formatting">
      <button type="button" className={TOOLBAR_BTN} disabled={disabled} title="Bold (*text*)" aria-label="Bold" onClick={() => onFormat('bold')}>
        <span className="font-bold">B</span>
      </button>
      <button type="button" className={TOOLBAR_BTN} disabled={disabled} title="Italic (_text_)" aria-label="Italic" onClick={() => onFormat('italic')}>
        <span className="italic">I</span>
      </button>
      <button type="button" className={TOOLBAR_BTN} disabled={disabled} title="Strikethrough (~text~)" aria-label="Strikethrough" onClick={() => onFormat('strike')}>
        <span className="line-through">S</span>
      </button>
      <button type="button" className={TOOLBAR_BTN} disabled={disabled} title="Monospace (```text```)" aria-label="Monospace" onClick={() => onFormat('code')}>
        <span className="font-mono text-[10px]">{'</>'}</span>
      </button>
    </div>
  );
}
