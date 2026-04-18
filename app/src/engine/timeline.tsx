import { createContext, useContext, type ReactNode } from 'react';
import { clamp } from './math';

export type TimelineContextValue = {
  time: number;
  /** Playback length (local timeline span). */
  duration: number;
  /** Seconds skipped at the beginning of the scaled composition (editor trim). */
  compositionStartSec: number;
  playing: boolean;
  setTime: (t: number) => void;
  setPlaying: (p: boolean | ((prev: boolean) => boolean)) => void;
};

export const TimelineContext = createContext<TimelineContextValue>({
  time: 0,
  duration: 10,
  compositionStartSec: 0,
  playing: false,
  setTime: () => {},
  setPlaying: () => {},
});

export const useTime = () => useContext(TimelineContext).time;
export const useTimeline = () => useContext(TimelineContext);

export type SpriteContextValue = {
  localTime: number;
  progress: number;
  duration: number;
  visible: boolean;
};

export const SpriteContext = createContext<SpriteContextValue>({
  localTime: 0,
  progress: 0,
  duration: 0,
  visible: false,
});

export const useSprite = () => useContext(SpriteContext);

type SpriteProps = {
  start?: number;
  end?: number;
  keepMounted?: boolean;
  children: ReactNode | ((ctx: SpriteContextValue) => ReactNode);
};

export function Sprite({
  start = 0,
  end = Infinity,
  keepMounted = false,
  children,
}: SpriteProps) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress =
    duration > 0 && isFinite(duration) ? clamp(localTime / duration, 0, 1) : 0;

  const value: SpriteContextValue = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}
