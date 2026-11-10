import { getCollection, type CollectionEntry } from 'astro:content';
import site from '../data/site.json';
import { withBase } from './url';

export type Post = CollectionEntry<'posts'>;
export type NavItem = (typeof site.nav)[number];

export interface SocialLink {
  label: string;
  href: string;
}

export const siteConfig = site;

export const categoryNav = site.nav.filter((item) => item.key !== 'about');

export const socialLinks: SocialLink[] = site.social;

export function getCategoryMeta(key: string): NavItem | undefined {
  return site.nav.find((item) => item.key === key);
}

export function getCategoryLabel(key: string): string {
  return getCategoryMeta(key)?.label ?? key;
}

export function getPostSlug(post: Post): string {
  return post.id.split('/').pop() ?? post.id;
}

export function getPostUrl(post: Post): string {
  return withBase(`/${post.data.category}/${getPostSlug(post)}/`);
}

export function sortByDateDesc(a: Post, b: Post): number {
  return b.data.date.valueOf() - a.data.date.valueOf();
}

export async function getAllPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort(sortByDateDesc);
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => !post.data.draft);
}

export async function getPostsByCategory(category: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.category === category);
}

export async function getFeaturedPosts(limit = 3): Promise<Post[]> {
  const posts = await getPublishedPosts();
  const featured = posts.filter((post) => post.data.featured);
  if (featured.length >= limit) return featured.slice(0, limit);
  const rest = posts.filter((post) => !post.data.featured);
  return [...featured, ...rest].slice(0, limit);
}

export function postReadingMinutes(post: Post): number {
  const body = (post as Post & { body?: string }).body ?? '';
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_`~-]/g, ' ');
  const chars = plain.replace(/\s/g, '').length;
  return Math.max(1, Math.round(chars / 420));
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
}
