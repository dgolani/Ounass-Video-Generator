/**
 * Unified music lookup: bundled (`public/audio` registry), repo assets (`src/assets/music/**`),
 * and user uploads persisted in localStorage.
 */

import { getAssetMusicTrack } from './assetMusicLibrary';
import type { MusicTrack } from './musicTracks';
import { getMusicTrack as getBundledTrack } from './musicTracks';
import { getUserMusicTrack } from './userMusicStorage';

export type { MusicTrack } from './musicTracks';
export { MUSIC_TRACKS, resolveAudioUrl } from './musicTracks';
export { ASSET_MUSIC_TRACKS } from './assetMusicLibrary';
export {
  addUserMusicFile,
  listUserMusicSummaries,
  listUserMusicTracks,
  removeUserMusic,
  type UserMusicSummary,
} from './userMusicStorage';

export function getMusicTrack(id: string | null): MusicTrack | null {
  if (!id) return null;
  const user = getUserMusicTrack(id);
  if (user) return user;
  const asset = getAssetMusicTrack(id);
  if (asset) return asset;
  return getBundledTrack(id);
}
