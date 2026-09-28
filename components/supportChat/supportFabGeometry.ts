/** Layout math for the support button. Positions are viewport pixels, origin top-left. */

export const FAB_SIZE = 52;
const EDGE_GAP = 16;
/** Default sits above a one-line chat composer so it does not cover Send. */
const DEFAULT_BOTTOM_GAP = 96;
const DRAG_MARGIN = 12;

export type FabPoint = { x: number; y: number };

export type StoredFab = FabPoint & { hidden?: boolean };

export function clampFabPoint(point: FabPoint, size = FAB_SIZE): FabPoint {
  const maxX = Math.max(DRAG_MARGIN, window.innerWidth - size - DRAG_MARGIN);
  const maxY = Math.max(DRAG_MARGIN, window.innerHeight - size - DRAG_MARGIN);
  return {
    x: Math.min(maxX, Math.max(DRAG_MARGIN, point.x)),
    y: Math.min(maxY, Math.max(DRAG_MARGIN, point.y)),
  };
}

export function defaultFabPoint(): FabPoint {
  const rtl = document.documentElement.dir === 'rtl';
  return clampFabPoint({
    x: rtl ? EDGE_GAP : window.innerWidth - FAB_SIZE - EDGE_GAP,
    y: window.innerHeight - FAB_SIZE - DEFAULT_BOTTOM_GAP,
  });
}

/**
 * Messenger-style dock: the button can be dragged anywhere, then rests on the
 * nearer side at the height where it was released.
 */
export function dockFabToEdge(point: FabPoint): FabPoint {
  const centerX = point.x + FAB_SIZE / 2;
  const x = centerX < window.innerWidth / 2 ? EDGE_GAP : window.innerWidth - FAB_SIZE - EDGE_GAP;
  return clampFabPoint({ x, y: point.y });
}

export function panelAnchorForFab(fab: FabPoint): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const gap = 12;
  const panelW = Math.min(384, vw - margin * 2);
  const panelH = Math.min(432, Math.round(vh * 0.76));

  let top = fab.y - gap - panelH;
  if (top < margin) top = fab.y + FAB_SIZE + gap;
  if (top + panelH > vh - margin) top = Math.max(margin, vh - margin - panelH);

  const onRight = fab.x + FAB_SIZE / 2 > vw / 2;
  let left = onRight ? fab.x + FAB_SIZE - panelW : fab.x;
  const maxLeft = Math.max(margin, vw - margin - panelW);
  left = Math.min(Math.max(margin, left), maxLeft);
  return { top, left };
}

const STORAGE_PREFIX = 'loopSupportFabPosition';

function storageKey(userId: number) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readStoredFab(userId: number): StoredFab | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredFab;
    if (typeof parsed?.x !== 'number' || typeof parsed?.y !== 'number') return null;
    const point = dockFabToEdge(parsed);
    return { ...point, hidden: Boolean(parsed.hidden) };
  } catch {
    return null;
  }
}

export function writeStoredFab(userId: number, fab: StoredFab) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(fab));
  } catch {
    /* private mode / quota */
  }
}
