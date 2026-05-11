const MAX_LONG_EDGE = 1920;
const WEBP_QUALITY = 0.84;

/**
 * Downscale and re-encode raster images for team chat upload.
 * Skips GIF (animation) and non-images.
 */
export async function compressImageForChat(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    let { width: w, height: h } = bitmap;
    const long = Math.max(w, h);
    if (long > MAX_LONG_EDGE) {
      const scale = MAX_LONG_EDGE / long;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const tryWebp = (): Promise<Blob | null> =>
      new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', WEBP_QUALITY);
      });

    let blob = await tryWebp();
    if (!blob || blob.size < 100) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', WEBP_QUALITY);
      });
    }
    if (!blob) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const base = (file.name || 'image').replace(/\.[^/.]+$/, '');
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
