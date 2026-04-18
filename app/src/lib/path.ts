// Minimal dot-path get/set — used by the schema-driven properties panel
// to read/write arbitrary nested fields on a template props object.

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  if (!path) return value as T;
  const keys = path.split('.');
  const clone: unknown = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  let cursor: Record<string, unknown> = clone as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const next = cursor[key];
    const copy = Array.isArray(next)
      ? [...next]
      : next && typeof next === 'object'
        ? { ...(next as object) }
        : {};
    cursor[key] = copy;
    cursor = copy as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
  return clone as T;
}
