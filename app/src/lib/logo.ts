// Shared helpers for the boutique logo — encoding uploads, detecting
// SVG vs raster, and minimal sanitisation. Templates render logos via
// `<BoutiqueLogo>` in `src/templates/`; this module is the pure-util
// layer underneath.

/** Minimal SVG safety sweep: strip `<script>` blocks and event handlers
 *  (`onload=`, `onclick=`, etc.) before we embed a user's SVG in the
 *  document as a data URL. Not full DOMPurify — a pragmatic first line. */
export function sanitizeSvg(svg: string): string {
  let out = svg;
  // Drop <script>…</script>
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Drop inline on-event attributes (onload=, onclick=, on*=…)
  out = out.replace(/\son\w+\s*=\s*"(?:[^"\\]|\\.)*"/gi, '');
  out = out.replace(/\son\w+\s*=\s*'(?:[^'\\]|\\.)*'/gi, '');
  out = out.replace(/\son\w+\s*=\s*[^"'\s>]+/gi, '');
  return out;
}

/** Wrap an SVG source string as a data URL (UTF-8, URL-encoded — smaller
 *  than base64 for text content). */
export function svgToDataURL(svg: string): string {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/** Read a file as text (for SVG uploads). */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error ?? new Error('File read failed'));
    r.readAsText(file);
  });
}

/** True if the given string is an SVG data URL (our mask-image path). */
export function isSvgDataURL(url: string): boolean {
  return url.startsWith('data:image/svg+xml');
}

/** Is the uploaded file an SVG? Accepts `image/svg+xml` MIME or `.svg`. */
export function isSvgFile(file: File): boolean {
  if (file.type === 'image/svg+xml') return true;
  if (file.type.startsWith('image/svg')) return true;
  return file.name.toLowerCase().endsWith('.svg');
}
