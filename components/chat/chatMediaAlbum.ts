export type ChatMediaAlbumItem = {
  id: string;
  kind: 'image' | 'video';
  url: string;
  filename?: string | null;
  width?: number | null;
  height?: number | null;
};

type AlbumSource = {
  id: string | number;
  kind?: string | null;
  url?: string | null;
  filename?: string | null;
  width?: number | null;
  height?: number | null;
};

/** Build a chronological album of image/video attachments from loaded conversation messages. */
export function buildChatMediaAlbum(sources: AlbumSource[]): ChatMediaAlbumItem[] {
  const out: ChatMediaAlbumItem[] = [];
  for (const s of sources) {
    const kind = s.kind;
    const url = (s.url || '').trim();
    if (!url) continue;
    if (kind !== 'image' && kind !== 'video') continue;
    out.push({
      id: String(s.id),
      kind,
      url,
      filename: s.filename ?? null,
      width: s.width ?? null,
      height: s.height ?? null,
    });
  }
  return out;
}

export function findChatMediaAlbumIndex(
  items: ChatMediaAlbumItem[],
  id: string
): number {
  const idx = items.findIndex((it) => it.id === id);
  return idx >= 0 ? idx : 0;
}
