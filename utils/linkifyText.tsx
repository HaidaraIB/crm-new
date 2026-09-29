import React from 'react';

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

const DEFAULT_LINK_CLASS =
  'font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200';

/** Turn http(s) URLs in plain text into external links; other text unchanged. */
export function linkifyHttpUrls(
  text: string,
  keyPrefix: string,
  linkClassName = DEFAULT_LINK_CLASS
): React.ReactNode[] {
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
        className={linkClassName}
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
