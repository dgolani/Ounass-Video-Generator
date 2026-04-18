import { useCallback, useEffect, useRef, useState } from 'react';

// Linear undo/redo stack with debounced commits.
// Rapid successive updates (e.g. typing) coalesce into one history entry
// after `debounceMs` of idle, so Cmd-Z undoes a whole typing burst.

type State<T> = { stack: T[]; idx: number };

export function useHistory<T>(
  initial: T,
  { maxDepth = 50, debounceMs = 300 }: { maxDepth?: number; debounceMs?: number } = {},
) {
  const [value, setValue] = useState<T>(initial);
  const stateRef = useRef<State<T>>({ stack: [initial], idx: 0 });
  const timerRef = useRef<number | null>(null);
  const [, force] = useState(0);
  const bump = () => force((x) => x + 1);

  const commit = useCallback(
    (v: T) => {
      const { stack, idx } = stateRef.current;
      const base = stack.slice(0, idx + 1);
      if (Object.is(base[base.length - 1], v)) return; // no-op
      base.push(v);
      while (base.length > maxDepth) base.shift();
      stateRef.current = { stack: base, idx: base.length - 1 };
      bump();
    },
    [maxDepth],
  );

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => commit(resolved), debounceMs);
        return resolved;
      });
    },
    [commit, debounceMs],
  );

  const flushPending = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      commit(value);
    }
  }, [commit, value]);

  const undo = useCallback(() => {
    flushPending();
    const { stack, idx } = stateRef.current;
    if (idx <= 0) return;
    const newIdx = idx - 1;
    stateRef.current = { stack, idx: newIdx };
    setValue(stack[newIdx]);
    bump();
  }, [flushPending]);

  const redo = useCallback(() => {
    flushPending();
    const { stack, idx } = stateRef.current;
    if (idx >= stack.length - 1) return;
    const newIdx = idx + 1;
    stateRef.current = { stack, idx: newIdx };
    setValue(stack[newIdx]);
    bump();
  }, [flushPending]);

  /** Replace the entire stack. Use when switching to a different project. */
  const reset = useCallback((v: T) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stateRef.current = { stack: [v], idx: 0 };
    setValue(v);
    bump();
  }, []);

  // Keyboard shortcuts — ignore while typing in inputs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key !== 'z' && e.key !== 'Z') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        // Let native undo/redo work inside text fields
        return;
      }
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const { stack, idx } = stateRef.current;
  return {
    value,
    set,
    undo,
    redo,
    reset,
    canUndo: idx > 0,
    canRedo: idx < stack.length - 1,
  };
}
