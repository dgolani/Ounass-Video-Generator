# Export background music

Place **MP3** (or add a row in `src/lib/musicTracks.ts` pointing to another format ffmpeg accepts) files here and register them in `musicTracks.ts` with `id`, `label`, `src` (e.g. `/audio/your-track.mp3`), and optional `attribution` when your license requires it.

`placeholder-bed.mp3` is for **local development** only; swap it for properly licensed beds before shipping to clients and update `label` / `attribution` in `musicTracks.ts` accordingly.

Editor timeline behavior (filmstrip, video lane, music, playhead) is documented in the repo root **[HANDOFF.md](../../../HANDOFF.md)** (search for `EditorTimelineDock`).
