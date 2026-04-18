import type { MusicTrack } from './musicTracks';

const STORAGE_KEY = 'vag:user-music-library:v1';

/** ~2.5 MiB raw audio per file keeps JSON under typical 5 MiB localStorage after base64. */
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

type StoredItem = {
  id: string;
  name: string;
  mime: string;
  /** Raw base64 payload only (no data: prefix). */
  dataBase64: string;
};

type StoredRoot = { v: 1; items: StoredItem[] };

function emptyRoot(): StoredRoot {
  return { v: 1, items: [] };
}

function readRoot(): StoredRoot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRoot();
    const parsed = JSON.parse(raw) as StoredRoot;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) return emptyRoot();
    return parsed;
  } catch {
    return emptyRoot();
  }
}

function writeRoot(root: StoredRoot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
}

export type UserMusicSummary = { id: string; name: string };

export function listUserMusicSummaries(): UserMusicSummary[] {
  return readRoot().items.map((i) => ({ id: i.id, name: i.name }));
}

/** Full tracks for library UI (includes base64 payload — avoid calling in tight loops). */
export function listUserMusicTracks(): MusicTrack[] {
  return readRoot().items.map((item) => ({
    id: item.id,
    label: item.name.replace(/\.[^.]+$/i, '') || item.name,
    src: `data:${item.mime};base64,${item.dataBase64}`,
  }));
}

export function getUserMusicTrack(id: string): MusicTrack | null {
  if (!id.startsWith('user:')) return null;
  const item = readRoot().items.find((i) => i.id === id);
  if (!item) return null;
  const label = item.name.replace(/\.[^.]+$/i, '') || item.name;
  return {
    id: item.id,
    label,
    src: `data:${item.mime};base64,${item.dataBase64}`,
  };
}

export function removeUserMusic(id: string): void {
  const root = readRoot();
  root.items = root.items.filter((i) => i.id !== id);
  writeRoot(root);
}

/**
 * Persist one file in **localStorage** (base64). Fails if the file is too large or quota is exceeded.
 */
export async function addUserMusicFile(file: File): Promise<{ id: string }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `File is too large for browser storage (${(file.size / 1024 / 1024).toFixed(1)} MiB). Max is ${(MAX_FILE_BYTES / 1024 / 1024).toFixed(1)} MiB — trim the file or add it under src/assets/music instead.`,
    );
  }

  const dataUrl = await readFileAsDataUrl(file);
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('Could not read file as base64 audio.');

  const mime = m[1] || file.type || 'audio/mpeg';
  const dataBase64 = m[2];
  const id = `user:${crypto.randomUUID()}`;
  const root = readRoot();

  const next: StoredItem = { id, name: file.name || 'uploaded-audio', mime, dataBase64 };
  const trial: StoredRoot = { v: 1, items: [...root.items, next] };
  try {
    writeRoot(trial);
  } catch (e) {
    const name = e instanceof DOMException ? e.name : '';
    if (name === 'QuotaExceededError' || (e as Error)?.name === 'QuotaExceededError') {
      throw new Error(
        'Browser storage is full. Remove an uploaded track or use a smaller file.',
      );
    }
    throw e;
  }
  return { id };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Read failed'));
    r.readAsDataURL(file);
  });
}
