import type { APIRoute } from 'astro';
import { getCategoryLabel, getPostUrl, getPublishedPosts } from '../lib/content';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    category: post.data.category,
    categoryLabel: getCategoryLabel(post.data.category),
    tags: post.data.tags,
    url: getPostUrl(post),
    date: post.data.date.toISOString(),
  }));

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
