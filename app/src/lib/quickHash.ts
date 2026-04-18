/** Small stable fingerprint for cache keys (not cryptographic). */
export function quickHash(input: string): string {
  let h = 2166136261;
  const n = Math.min(input.length, 8000);
  for (let i = 0; i < n; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
