import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from './math';

export type StageController = {
  time: number;
  setTime: (t: number | ((prev: number) => number)) => void;
  playing: boolean;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
  duration: number;
  reset: () => void;
  togglePlay: () => void;
};

type Options = {
  duration: number;
  loop?: boolean;
  autoplay?: boolean;
  persistKey?: string;
  /** When false, skip the window keydown listener (space, arrows, home).
   *  Set false for multiple stages on one page (gallery/dashboard previews)
   *  so they don't all toggle on a single key press. Default true. */
  keyboard?: boolean;
};

export function useStageController({
  duration,
  loop = true,
  autoplay = true,
  persistKey,
  keyboard = true,
}: Options): StageController {
  const [time, setTime] = useState<number>(() => {
    if (!persistKey) return 0;
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch {
      return 0;
    }
  });
  const [playing, setPlaying] = useState<boolean>(autoplay);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // Persist playhead
  useEffect(() => {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey + ':t', String(time));
    } catch {
      /* ignore */
    }
  }, [time, persistKey]);

  // Animation loop
  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else {
            next = duration;
            setPlaying(false);
          }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard controls
  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      )
        return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime((t) => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime((t) => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, keyboard]);

  useEffect(() => {
    setTime((t) => clamp(t, 0, duration));
  }, [duration]);

  const reset = useCallback(() => setTime(0), []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  return {
    time,
    setTime,
    playing,
    setPlaying,
    duration,
    reset,
    togglePlay,
  };
}
