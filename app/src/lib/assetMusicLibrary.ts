import type { MusicTrack } from './musicTracks';

const modules = import.meta.glob('../assets/music/**/*.{mp3,m4a,wav,ogg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function relFromGlobKey(key: string): string {
  return key.replace(/^\.\.\/assets\/music\//, '').replace(/^\.\.[/\\]assets[/\\]music[/\\]/, '');
}

function labelFromRel(rel: string): string {
  const base = rel.split(/[/\\]/).pop() ?? rel;
  const noExt = base.replace(/\.[^.]+$/i, '');
  return noExt.replace(/[-_]+/g, ' ').trim() || rel;
}

function idFromRel(rel: string): string {
  return `asset:${encodeURIComponent(rel)}`;
}

/** Build-time list of every audio file under `src/assets/music/` (any depth). */
export const ASSET_MUSIC_TRACKS: MusicTrack[] = Object.entries(modules)
  .map(([key, url]) => {
    const rel = relFromGlobKey(key);
    return {
      id: idFromRel(rel),
      label: labelFromRel(rel),
      src: url,
    } satisfies MusicTrack;
  })
  .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

export function getAssetMusicTrack(id: string): MusicTrack | null {
  if (!id.startsWith('asset:')) return null;
  return ASSET_MUSIC_TRACKS.find((t) => t.id === id) ?? null;
}
