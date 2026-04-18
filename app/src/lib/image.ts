// Resize an uploaded image to a capped max width and return a JPEG data URL.
// Keeps aspect ratio; capped at 1080px by default to match our 1080-wide canvas.
// Data URLs bloat ~33% over raw bytes, so a 2MB photo becomes ~300KB after this.

export async function resizeImageToDataURL(
  file: File,
  maxWidth = 1080,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`Not an image file: ${file.type || 'unknown type'}`);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', quality);
}

/** Rough size estimate in bytes from a base64 data URL. */
export function dataURLBytes(dataURL: string): number {
  const i = dataURL.indexOf(',');
  if (i < 0) return dataURL.length;
  const b64 = dataURL.slice(i + 1);
  return Math.floor((b64.length * 3) / 4);
}
