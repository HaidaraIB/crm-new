import React, { useEffect, useLayoutEffect, useRef } from 'react';

import { ChevronDownIcon } from '../icons';
import { translations } from '../../constants';
import type { SupportChatMessage } from '../../services/api';
import { SupportMessageBubble } from './SupportMessageBubble';

const NEAR_BOTTOM_PX = 80;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP_PX = 24;

function MessageReplyGesture({
  label,
  onReply,
  children,
}: {
  label: string;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  return (
    <div
      className="touch-manipulation"
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, video, audio, input')) return;
        const now = performance.now();
        const prev = lastTap.current;
        const dt = now - prev.t;
        const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        if (dt > 40 && dt < DOUBLE_TAP_MS && dist < DOUBLE_TAP_SLOP_PX) {
          lastTap.current = { t: 0, x: 0, y: 0 };
          onReply();
          return;
        }
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }}
    >
      {children}
      <button
        type="button"
        className="sr-only"
        aria-label={label}
        onClick={onReply}
      >
        {label}
      </button>
    </div>
  );
}

function isNearBottom(scroller: HTMLElement): boolean {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_BOTTOM_PX;
}

type Props = {
  messages: SupportChatMessage[];
  t: (key: keyof typeof translations.en) => string;
  hasOlder: boolean;
  olderLoading: boolean;
  onLoadOlder: () => void;
  onReply: (message: SupportChatMessage) => void;
  showJumpToLatest?: boolean;
  onJumpToLatest?: () => void;
  onNearBottomChange?: (nearBottom: boolean) => void;
  /** When the reply banner opens, shift the transcript up by the space it takes. */
  replyOpen?: boolean;
  compact?: boolean;
  onOpenMedia?: (message: SupportChatMessage) => void;
};

export const SupportMessageList: React.FC<Props> = ({
  messages,
  t,
  hasOlder,
  olderLoading,
  onLoadOlder,
  onReply,
  showJumpToLatest,
  onJumpToLatest,
  onNearBottomChange,
  replyOpen = false,
  compact = false,
  onOpenMedia,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);
  const lastTailIdRef = useRef<number | null>(null);
  const replyWasOpenRef = useRef(false);
  const scrollerHeightRef = useRef(0);

  useLayoutEffect(() => {
    const sc = scrollerRef.current;
    if (!sc || messages.length === 0) {
      lastTailIdRef.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    const prevTail = lastTailIdRef.current;
    lastTailIdRef.current = last.id;

    if (prevTail == null) {
      if (pinnedToBottomRef.current) {
        sc.scrollTop = sc.scrollHeight;
      }
      return;
    }
    if (last.id === prevTail) return;

    const shouldFollow =
      pinnedToBottomRef.current || isNearBottom(sc) || last.is_mine;
    if (!shouldFollow) return;

    sc.scrollTop = sc.scrollHeight;
    pinnedToBottomRef.current = true;
  }, [messages]);

  useLayoutEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const prevHeight = scrollerHeightRef.current;
    const nextHeight = sc.clientHeight;
    if (replyOpen && !replyWasOpenRef.current && prevHeight > nextHeight) {
      sc.scrollTop += prevHeight - nextHeight;
    }
    replyWasOpenRef.current = replyOpen;
    scrollerHeightRef.current = sc.clientHeight;
  }, [replyOpen]);

  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const onScroll = () => {
      const near = isNearBottom(sc);
      pinnedToBottomRef.current = near;
      onNearBottomChange?.(near);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => sc.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToLatest = () => {
    const sc = scrollerRef.current;
    if (sc) {
      sc.scrollTop = sc.scrollHeight;
      pinnedToBottomRef.current = true;
    }
    onJumpToLatest?.();
  };

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollerRef}
        className={`custom-scrollbar flex-1 overflow-y-auto space-y-2 ${compact ? 'px-2 py-2' : 'px-3 py-4 space-y-3'}`}
        onScroll={() => {
          const el = scrollerRef.current;
          if (!el || !hasOlder || olderLoading) return;
          if (el.scrollTop < 48) onLoadOlder();
        }}
      >
        {hasOlder ? (
          <button
            type="button"
            disabled={olderLoading}
            onClick={onLoadOlder}
            className="mx-auto block text-xs text-primary disabled:opacity-50"
          >
            {olderLoading ? '…' : t('supportChatLoadOlder')}
          </button>
        ) : null}
        {messages.map((m) =>
          m.side === 'system' ? (
            <SupportMessageBubble key={m.id} message={m} t={t} compact={compact} onOpenMedia={onOpenMedia} />
          ) : (
            <MessageReplyGesture key={m.id} label={t('supportChatReply')} onReply={() => onReply(m)}>
              <SupportMessageBubble message={m} t={t} compact={compact} onOpenMedia={onOpenMedia} />
            </MessageReplyGesture>
          )
        )}
      </div>
      {showJumpToLatest && onJumpToLatest ? (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 end-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg"
          aria-label={t('supportChatJumpToLatest')}
          title={t('supportChatJumpToLatest')}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
};
