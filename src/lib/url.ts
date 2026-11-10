const BASE = import.meta.env.BASE_URL || '/';

/**
 * Prefix an internal path with Astro's configured base path.
 * External URLs, anchors and mailto/tel links are returned unchanged.
 */
export function withBase(path: string): string {
  if (!path || path === '/') return BASE;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path)) return path;

  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
}
