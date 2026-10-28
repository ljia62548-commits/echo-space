import type { APIRoute } from 'astro';
import { categoryNav, getAllTags, getPostUrl, getPublishedPosts } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const posts = await getPublishedPosts();
  const tags = await getAllTags();

  const staticPages = ['/', '/about/', '/archive/', '/tags/'];
  const entries = [
    ...staticPages.map((path) => ({ loc: new URL(path, base).href, lastmod: undefined })),
    ...categoryNav.map((category) => ({
      loc: new URL(category.href, base).href,
      lastmod: undefined,
    })),
    ...posts.map((post) => ({
      loc: new URL(getPostUrl(post), base).href,
      lastmod: (post.data.updated ?? post.data.date).toISOString(),
    })),
    ...tags.map(({ tag }) => ({
      loc: new URL(`/tags/${encodeURIComponent(tag)}/`, base).href,
      lastmod: undefined,
    })),
  ];

  const urls = entries
    .map(
      ({ loc, lastmod }) => `  <url>
    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
