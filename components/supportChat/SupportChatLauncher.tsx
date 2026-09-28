import React, { useEffect, useRef, useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { useSyncDigest } from '../../hooks/useQueries';
import { XIcon } from '../icons';
import { SupportChatPanel } from './SupportChatPanel';
import {
  FAB_SIZE,
  type FabPoint,
  clampFabPoint,
  defaultFabPoint,
  dockFabToEdge,
  panelAnchorForFab,
  readStoredFab,
  writeStoredFab,
} from './supportFabGeometry';

const DRAG_THRESHOLD = 8;
const PEEK_SIZE = 44;
const PEEK_TOP_GAP = 12;
/** Keep the restore icon above a chat composer's send button. */
const PEEK_BOTTOM_GAP = 88;

function SupportMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-900">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export const SupportChatLauncher: React.FC = () => {
  const { t, currentUser, isTeamChatDialogOpen } = useAppContext();
  const { data: digest } = useSyncDigest({ enabled: false, refetchInterval: false });
  const userId = currentUser?.id;
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(() =>
    userId != null ? Boolean(readStoredFab(userId)?.hidden) : false
  );
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [position, setPosition] = useState<FabPoint>(() => {
    if (userId == null) return defaultFabPoint();
    const stored = readStoredFab(userId);
    return stored ? { x: stored.x, y: stored.y } : defaultFabPoint();
  });
  const positionRef = useRef(position);
  positionRef.current = position;
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const settleTimerRef = useRef<number | null>(null);

  const isOwner = Boolean(currentUser?.is_company_owner ?? currentUser?.isCompanyOwner);
  const unread = digest?.support_chat_unread ?? 0;

  const persist = (next: FabPoint, isHidden = hiddenRef.current) => {
    positionRef.current = next;
    hiddenRef.current = isHidden;
    if (userId != null) writeStoredFab(userId, { ...next, hidden: isHidden });
  };

  useEffect(() => {
    if (userId == null) return;
    const stored = readStoredFab(userId);
    if (!stored) return;
    setPosition({ x: stored.x, y: stored.y });
    setHidden(Boolean(stored.hidden));
  }, [userId]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => {
        const next = dockFabToEdge(clampFabPoint(current));
        positionRef.current = next;
        if (userId != null) writeStoredFab(userId, { ...next, hidden: hiddenRef.current });
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [userId]);

  useEffect(() => {
    if (isTeamChatDialogOpen) setOpen(false);
  }, [isTeamChatDialogOpen]);

  useEffect(() => () => {
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
  }, []);

  if (!isOwner || isTeamChatDialogOpen) return null;

  const place = (next: FabPoint, animate: boolean) => {
    positionRef.current = next;
    setPosition(next);
    if (!animate) return;
    setSettling(true);
    if (settleTimerRef.current != null) window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => setSettling(false), 220);
  };

  const hideLauncher = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    setHidden(true);
    persist(positionRef.current, true);
  };

  const showLauncher = () => {
    setHidden(false);
    persist(positionRef.current, false);
    setOpen(true);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSettling(false);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragging(true);
    const next = clampFabPoint({ x: drag.originX + dx, y: drag.originY + dy });
    positionRef.current = next;
    setPosition(next);
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    suppressClickRef.current = true;
    const docked = dockFabToEdge(positionRef.current);
    place(docked, true);
    persist(docked, false);
  };

  const onEdge = position.x + FAB_SIZE / 2 > window.innerWidth / 2;
  const dismissOnLeft = onEdge;

  if (hidden) {
    const peekY = Math.min(
      Math.max(PEEK_TOP_GAP, position.y),
      Math.max(PEEK_TOP_GAP, window.innerHeight - PEEK_SIZE - PEEK_BOTTOM_GAP),
    );
    return (
      <button
        type="button"
        onClick={showLauncher}
        aria-label={t('supportChatShowLauncher')}
        title={t('supportChatShowLauncher')}
        style={{
          top: peekY,
          left: onEdge ? window.innerWidth - PEEK_SIZE : 0,
          width: PEEK_SIZE,
          height: PEEK_SIZE,
        }}
        className="fixed z-[60] flex items-center justify-center rounded-full bg-primary text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="relative">
          <SupportMark className="h-5 w-5" />
          <UnreadBadge count={unread} />
        </span>
      </button>
    );
  }

  return (
    <>
      <div
        className={`group fixed z-[60] ${settling ? 'transition-[left,top] duration-200 ease-out' : ''}`}
        style={{ left: position.x, top: position.y, width: FAB_SIZE, height: FAB_SIZE }}
      >
        <button
          type="button"
          style={{ touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onClick={() => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            setOpen((value) => !value);
          }}
          aria-expanded={open}
          aria-label={open ? t('supportChatClose') : t('supportChatOpenBubble')}
          title={open ? t('supportChatClose') : t('supportChatOpenBubble')}
          className={`relative flex h-full w-full items-center justify-center rounded-full text-white select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${
            dragging ? 'cursor-grabbing scale-105 shadow-2xl' : 'cursor-pointer shadow-lg'
          } ${
            open
              ? 'bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
              : 'bg-primary hover:brightness-110'
          }`}
        >
          {open ? <XIcon className="h-5 w-5" /> : <SupportMark className="h-7 w-7" />}
          {open ? null : <UnreadBadge count={unread} />}
        </button>
        {!open && !dragging ? (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={hideLauncher}
            aria-label={t('supportChatHideLauncher')}
            title={t('supportChatHideLauncher')}
            className={`absolute -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-opacity hover:text-gray-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 ${
              dismissOnLeft ? '-left-1.5' : '-right-1.5'
            } opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto`}
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <SupportChatPanel
        open={open}
        onClose={() => setOpen(false)}
        anchor={open ? panelAnchorForFab(position) : null}
      />
    </>
  );
};
