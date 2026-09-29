import React from 'react';
import { inputTextDir } from '../utils/inputAutoDir';
import { linkifyHttpUrls } from '../utils/linkifyText';

type PlainTextWithLinksProps = {
  text: string;
  className?: string;
};

/**
 * One block per source line. Direction comes from that line's first strong
 * letter and stays put when the line wraps (plaintext re-checks each wrap).
 */
export const PlainTextWithLinks: React.FC<PlainTextWithLinksProps> = ({
  text,
  className = '',
}) => {
  const lines = text.split('\n');
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span
          key={i}
          dir={line.trim() ? inputTextDir(line, false) : undefined}
          className="block whitespace-pre-wrap break-words"
        >
          {line === '' ? '\u00a0' : linkifyHttpUrls(line, `line-${i}`)}
        </span>
      ))}
    </span>
  );
};
