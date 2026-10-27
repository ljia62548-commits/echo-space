import type { APIRoute } from 'astro';
import site from '../data/site.json';
import { getCategoryLabel, getPostUrl, getPublishedPosts } from '../lib/content';
import { escapeXml } from '../lib/format';

export const GET: APIRoute = async ({ site: astroSite }) => {
  const posts = await getPublishedPosts();
  const base = astroSite ?? new URL('http://localhost:4321');
  const feedUrl = new URL('/rss.xml', base).href;
  const lastBuild = posts[0]?.data.date ?? new Date();

  const items = posts
    .map((post) => {
      const url = new URL(getPostUrl(post), base).href;
      const categories = [getCategoryLabel(post.data.category), ...post.data.tags]
        .map((name) => `      <category>${escapeXml(name)}</category>`)
        .join('\n');

      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.description)}</description>
${categories}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${new URL('/', base).href}</link>
    <description>${escapeXml(site.description)}</description>
    <language>zh-cn</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
