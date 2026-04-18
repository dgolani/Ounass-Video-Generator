import { useEffect, useState, useCallback } from 'react';
import type { Project } from './types';

const KEY = 'vag:projects:v1';
const CHANNEL = 'vag:projects:changed';

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class StorageQuotaError extends Error {
  constructor() {
    super('Storage quota exceeded');
    this.name = 'StorageQuotaError';
  }
}

function writeAll(projects: Project[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects));
    window.dispatchEvent(new CustomEvent(CHANNEL));
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)
    ) {
      throw new StorageQuotaError();
    }
    /* private mode / other — swallow to avoid breaking UI */
  }
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function createProject(
  init: Pick<Project, 'templateId' | 'props' | 'aspectIndex' | 'duration' | 'name'>,
): Project {
  const now = Date.now();
  const project: Project = {
    id: uid(),
    createdAt: now,
    updatedAt: now,
    ...init,
  };
  const all = readAll();
  all.unshift(project);
  writeAll(all);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
): Project | null {
  const all = readAll();
  const i = all.findIndex((p) => p.id === id);
  if (i === -1) return null;
  const updated: Project = { ...all[i], ...patch, updatedAt: Date.now() };
  all[i] = updated;
  writeAll(all);
  return updated;
}

export function deleteProject(id: string) {
  const all = readAll().filter((p) => p.id !== id);
  writeAll(all);
}

export function getProject(id: string): Project | null {
  return readAll().find((p) => p.id === id) ?? null;
}

/** React hook: subscribe to the project list */
export function useProjects(): Project[] {
  const [list, setList] = useState<Project[]>(() => readAll());
  useEffect(() => {
    const onChange = () => setList(readAll());
    window.addEventListener(CHANNEL, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANNEL, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return list;
}

/** React hook: load + save a single project by id */
export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(() =>
    id ? getProject(id) : null,
  );

  useEffect(() => {
    setProject(id ? getProject(id) : null);
  }, [id]);

  const save = useCallback(
    (patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
      if (!id) return { ok: true as const };
      try {
        const next = updateProject(id, patch);
        if (next) setProject(next);
        return { ok: true as const };
      } catch (e) {
        if (e instanceof StorageQuotaError) {
          return { ok: false as const, error: 'quota' as const };
        }
        throw e;
      }
    },
    [id],
  );

  return { project, save };
}
