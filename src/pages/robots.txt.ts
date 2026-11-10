import type { APIRoute } from 'astro';
import { withBase } from '../lib/url';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const sitemap = new URL(withBase('/sitemap.xml'), base).href;

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
