import { useEffect, useRef } from 'react';

type Params = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Resolved absolute URL, or null */
  src: string | null;
  enabled: boolean;
  volume: number;
  anchorVideoTime: number;
  trimStartSec: number;
  /** Video timeline time where music stops */
  musicEndVideoTime: number;
  playing: boolean;
  getVideoTime: () => number;
};

/**
 * Keeps an <audio> element aligned with the stage timeline (preview only).
 * When paused, seeks audio to match the scrubber; when playing, uses RAF
 * with light drift correction instead of hammering currentTime every frame.
 */
export function useEditorMusicPreview({
  audioRef,
  src,
  enabled,
  volume,
  anchorVideoTime,
  trimStartSec,
  musicEndVideoTime,
  playing,
  getVideoTime,
}: Params) {
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    if (!enabled || !src) {
      audioRef.current?.pause();
    }
    const el = audioRef.current;
    if (!el || !enabled || !src) return;
    el.volume = Math.min(1, Math.max(0, volume));
  }, [audioRef, enabled, src, volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !enabled || !src) {
      audioRef.current?.pause();
      return;
    }

    const v = Math.min(1, Math.max(0, volume));
    el.volume = v;

    if (!playing) {
      const t = getVideoTime();
      const rel = t - anchorVideoTime;
      const clipLen = Math.max(0.01, musicEndVideoTime - anchorVideoTime);
      if (rel < 0 || t >= musicEndVideoTime) {
        el.currentTime = trimStartSec;
        el.volume = 0;
      } else {
        el.currentTime = trimStartSec + Math.min(rel, clipLen - 0.001);
        el.volume = v;
      }
      el.pause();
      return;
    }

    let raf = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled || !playingRef.current) return;
      const node = audioRef.current;
      if (!node) return;

      const t = getVideoTime();
      const rel = t - anchorVideoTime;
      const clipLen = Math.max(0.01, musicEndVideoTime - anchorVideoTime);
      const audVol = Math.min(1, Math.max(0, volume));

      if (rel < 0 || t >= musicEndVideoTime) {
        node.volume = 0;
        node.pause();
        node.currentTime = trimStartSec;
      } else {
        node.volume = audVol;
        const target = trimStartSec + Math.min(rel, clipLen - 0.001);
        if (Math.abs(node.currentTime - target) > 0.35) {
          node.currentTime = target;
        }
        node.play().catch(() => {});
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [
    audioRef,
    enabled,
    src,
    playing,
    anchorVideoTime,
    trimStartSec,
    musicEndVideoTime,
    volume,
    getVideoTime,
  ]);
}
