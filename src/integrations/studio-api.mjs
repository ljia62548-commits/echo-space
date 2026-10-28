import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';

/**
 * Local-only editing API.
 *
 * This plugin runs inside `astro dev` and is never part of the static build.
 * It only listens on the dev server (bound to 127.0.0.1) and only accepts
 * same-origin requests from localhost.
 */

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src', 'data');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const UPLOADS_DIR = path.join(ROOT, 'public', 'uploads');
const MAX_JSON_BODY = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const SITE_KEYS = new Set([
  'name',
  'author',
  'description',
  'tagline',
  'locale',
  'hero',
  'nav',
  'social',
  'footerNote',
]);

const PROFILE_KEYS = new Set([
  'name',
  'monogram',
  'headline',
  'intro',
  'location',
  'status',
  'avatar',
  'bio',
  'interests',
  'toolbox',
  'timeline',
  'now',
  'links',
]);

const RESERVED_CATEGORY_KEYS = new Set([
  'about',
  'studio',
  'tags',
  'archive',
  'search',
  'rss',
  'sitemap',
  'robots',
]);

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

function fail(res, status, message) {
  sendJson(res, status, { error: message });
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isLocalOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // curl / local scripts
  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_JSON_BODY) {
        reject(new Error('请求内容过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('请求内容不是有效的 JSON'));
      }
    });

    req.on('error', reject);
  });
}

function inside(base, target) {
  const relative = path.relative(base, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function sanitizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sanitizeCategory(value) {
  const category = String(value ?? '').trim();
  return /^[a-z0-9][a-z0-9-]*$/.test(category) ? category : '';
}

function sanitizeText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function categoryDirectory(key) {
  const dir = path.join(POSTS_DIR, key);
  if (!inside(POSTS_DIR, dir)) {
    throw new Error('目录路径无效');
  }
  return dir;
}

async function categoryFiles(key) {
  const dir = categoryDirectory(key);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function updatePostsCategory(key, nextKey) {
  const entries = await categoryFiles(key);
  if (!entries) return 0;

  let updated = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const filePath = path.join(categoryDirectory(key), entry.name);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    parsed.data.category = nextKey;
    await fs.writeFile(filePath, matter.stringify(parsed.content, parsed.data), 'utf8');
    updated += 1;
  }
  return updated;
}

async function readJsonFile(name) {
  const raw = await fs.readFile(path.join(DATA_DIR, name), 'utf8');
  return JSON.parse(raw);
}

async function writeJsonFile(name, data) {
  const target = path.join(DATA_DIR, name);
  const temp = `${target}.tmp-${process.pid}-${Date.now()}`;
  const text = `${JSON.stringify(data, null, 2)}\n`;

  try {
    await fs.writeFile(temp, text, 'utf8');
    try {
      await fs.rename(temp, target);
    } catch {
      // Windows can refuse to rename over a file that the dev server is
      // currently reading. Fall back to an in-place copy.
      await fs.copyFile(temp, target);
    }
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}

function mergePatch(target, patch, depth = 0) {
  if (depth > 12) return target;

  if (Array.isArray(target)) {
    if (Array.isArray(patch)) return patch;
    if (isPlainObject(patch)) {
      const copy = target.slice();
      for (const [key, value] of Object.entries(patch)) {
        const index = Number(key);
        if (!Number.isInteger(index) || index < 0 || index >= copy.length) continue;
        copy[index] = isPlainObject(copy[index]) || Array.isArray(copy[index])
          ? mergePatch(copy[index], value, depth + 1)
          : value;
      }
      return copy;
    }
    return target;
  }

  if (isPlainObject(target) && isPlainObject(patch)) {
    const copy = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (!(key in copy)) continue;
      if (isPlainObject(copy[key]) || Array.isArray(copy[key])) {
        copy[key] = mergePatch(copy[key], value, depth + 1);
      } else if (typeof value === typeof copy[key] || copy[key] === null) {
        copy[key] = value;
      }
    }
    return copy;
  }

  return patch;
}

function validatePatch(patch, allowedKeys) {
  if (!isPlainObject(patch)) throw new Error('patch 必须是一个对象');
  for (const key of Object.keys(patch)) {
    if (!allowedKeys.has(key)) throw new Error(`不允许修改字段：${key}`);
  }
}

async function listPosts() {
  const posts = [];
  let categories = [];
  try {
    categories = await fs.readdir(POSTS_DIR, { withFileTypes: true });
  } catch {
    return posts;
  }

  for (const categoryEntry of categories) {
    if (!categoryEntry.isDirectory()) continue;
    const category = categoryEntry.name;
    if (!sanitizeCategory(category)) continue;

    const dir = path.join(POSTS_DIR, category);
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith('.md')) continue;
      const filePath = path.join(dir, file.name);
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = matter(raw);
      const data = parsed.data ?? {};

      posts.push({
        path: `${category}/${file.name}`,
        category,
        slug: file.name.replace(/\.md$/, ''),
        title: data.title ?? '',
        description: data.description ?? '',
        date: normalizeDate(data.date) ?? '',
        updated: normalizeDate(data.updated) ?? '',
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
        featured: Boolean(data.featured),
        draft: Boolean(data.draft),
        cover: data.cover ?? '',
        body: parsed.content.replace(/^\n+/, ''),
      });
    }
  }

  posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return posts;
}

function normalizeDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return date.toISOString().slice(0, 10);
}

function imageExtension(buffer, mime) {
  if (mime === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    mime === 'image/png' &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  if (
    mime === 'image/webp' &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return '';
}

async function handle(req, res) {
  if (!isLocalOrigin(req)) {
    fail(res, 403, '只允许本机页面访问编辑接口');
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const route = url.pathname.replace(/\/+$/, '') || '/';
  const method = req.method ?? 'GET';

  if (method === 'GET' && route === '/health') {
    sendJson(res, 200, { ok: true, mode: 'local' });
    return;
  }

  if (method === 'GET' && route === '/state') {
    const [site, profile, posts] = await Promise.all([
      readJsonFile('site.json'),
      readJsonFile('profile.json'),
      listPosts(),
    ]);
    sendJson(res, 200, { site, profile, posts });
    return;
  }

  if (method === 'GET' && route === '/posts') {
    sendJson(res, 200, { posts: await listPosts() });
    return;
  }

  if (method === 'POST' && route === '/site') {
    const body = await readJsonBody(req);
    validatePatch(body.patch, SITE_KEYS);
    const current = await readJsonFile('site.json');
    const next = mergePatch(current, body.patch);
    await writeJsonFile('site.json', next);
    sendJson(res, 200, { ok: true, site: next });
    return;
  }

  if (method === 'POST' && route === '/profile') {
    const body = await readJsonBody(req);
    validatePatch(body.patch, PROFILE_KEYS);
    const current = await readJsonFile('profile.json');
    const next = mergePatch(current, body.patch);
    await writeJsonFile('profile.json', next);
    sendJson(res, 200, { ok: true, profile: next });
    return;
  }

  if (method === 'POST' && route === '/categories') {
    const body = await readJsonBody(req);
    const site = await readJsonFile('site.json');
    const key = sanitizeCategory(body.key);
    const label = sanitizeText(body.label, 60);
    const description = sanitizeText(body.description, 160);

    if (!key) {
      fail(res, 400, '目录 URL 只能包含小写字母、数字和连字符');
      return;
    }
    if (!label) {
      fail(res, 400, '目录名称不能为空');
      return;
    }
    if (
      RESERVED_CATEGORY_KEYS.has(key) ||
      site.nav.some((item) => item.key === key)
    ) {
      fail(res, 409, '这个目录名已被占用');
      return;
    }

    const dir = categoryDirectory(key);
    try {
      await fs.mkdir(dir);
    } catch (error) {
      if (error?.code === 'EEXIST') {
        fail(res, 409, '对应的文章文件夹已经存在');
        return;
      }
      throw error;
    }

    const next = {
      ...site,
      nav: [
        ...site.nav,
        {
          key,
          label,
          href: `/${key}/`,
          description,
        },
      ],
    };

    try {
      await writeJsonFile('site.json', next);
    } catch (error) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
      throw error;
    }

    sendJson(res, 200, { ok: true, site: next });
    return;
  }

  if (method === 'POST' && route === '/categories/rename') {
    const body = await readJsonBody(req);
    const site = await readJsonFile('site.json');
    const key = sanitizeCategory(body.key);
    const index = site.nav.findIndex((item) => item.key === key);

    if (index < 0 || key === 'about') {
      fail(res, 404, '目录不存在');
      return;
    }

    const current = site.nav[index];
    const nextKey = sanitizeCategory(body.nextKey || key);
    if (!nextKey) {
      fail(res, 400, '目录 URL 只能包含小写字母、数字和连字符');
      return;
    }
    if (
      nextKey !== key &&
      (RESERVED_CATEGORY_KEYS.has(nextKey) ||
        site.nav.some((item) => item.key === nextKey))
    ) {
      fail(res, 409, '这个目录名已被占用');
      return;
    }

    const label = sanitizeText(body.label, 60) || current.label;
    const description = sanitizeText(body.description, 160) || current.description;
    let moved = 0;

    if (nextKey !== key) {
      const oldDir = categoryDirectory(key);
      const newDir = categoryDirectory(nextKey);
      let oldEntries = null;

      try {
        oldEntries = await fs.readdir(oldDir, { withFileTypes: true });
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      try {
        await fs.access(newDir);
        fail(res, 409, '目标目录已经存在');
        return;
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }

      if (oldEntries) {
        await fs.rename(oldDir, newDir);
      } else {
        await fs.mkdir(newDir, { recursive: true });
      }

      moved = await updatePostsCategory(nextKey, nextKey);
    }

    const nav = site.nav.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            key: nextKey,
            label,
            href: `/${nextKey}/`,
            description,
          }
        : item,
    );

    const next = { ...site, nav };
    await writeJsonFile('site.json', next);
    sendJson(res, 200, { ok: true, site: next, moved });
    return;
  }

  if (method === 'DELETE' && route === '/categories') {
    const key = sanitizeCategory(url.searchParams.get('key'));
    const site = await readJsonFile('site.json');
    const item = site.nav.find((entry) => entry.key === key);

    if (!item || key === 'about') {
      fail(res, 404, '目录不存在');
      return;
    }

    const entries = await categoryFiles(key);
    if (entries && entries.length > 0) {
      const posts = entries.filter(
        (entry) => entry.isFile() && entry.name.endsWith('.md'),
      ).length;
      if (posts > 0) {
        fail(res, 409, `目录里还有 ${posts} 篇文章，请先移走或删除后再删目录`);
        return;
      }
      fail(res, 409, '目录里还有文件，请先清空后再删目录');
      return;
    }

    if (entries) {
      await fs.rm(categoryDirectory(key), { recursive: true, force: true });
    }

    const next = {
      ...site,
      nav: site.nav.filter((entry) => entry.key !== key),
    };
    await writeJsonFile('site.json', next);
    sendJson(res, 200, { ok: true, site: next });
    return;
  }

  if (method === 'POST' && route === '/posts') {
    const body = await readJsonBody(req);

    const category = sanitizeCategory(body.category);
    if (!category) {
      fail(res, 400, '分类无效');
      return;
    }

    const site = await readJsonFile('site.json');
    const knownCategory = site.nav.some(
      (item) => item.key === category && item.key !== 'about',
    );
    if (!knownCategory) {
      fail(res, 400, '分类不存在');
      return;
    }

    const slug = sanitizeSlug(body.slug);
    if (!slug) {
      fail(res, 400, 'slug 只能包含小写字母、数字和连字符');
      return;
    }

    const title = sanitizeText(body.title, 140);
    if (!title) {
      fail(res, 400, '标题不能为空');
      return;
    }

    const date = normalizeDate(body.date) || new Date().toISOString().slice(0, 10);
    const description = sanitizeText(body.description, 400);
    const tags = Array.isArray(body.tags)
      ? body.tags.map((tag) => sanitizeText(tag, 40)).filter(Boolean).slice(0, 12)
      : [];
    const cover = sanitizeText(body.cover, 300);
    const content = String(body.body ?? '');
    if (content.length > 800_000) {
      fail(res, 400, '正文过长');
      return;
    }

    const frontmatter = {
      title,
      description,
      date,
      category,
      tags,
      featured: Boolean(body.featured),
      draft: Boolean(body.draft),
      ...(cover ? { cover } : {}),
    };

    if (body.originalPath) {
      frontmatter.updated = new Date().toISOString().slice(0, 10);
    }

    const file = matter.stringify(content, frontmatter);
    const target = path.join(POSTS_DIR, category, `${slug}.md`);
    if (!inside(POSTS_DIR, target)) {
      fail(res, 400, '文章路径无效');
      return;
    }

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file, 'utf8');

    if (body.originalPath) {
      const original = path.join(POSTS_DIR, String(body.originalPath));
      if (inside(POSTS_DIR, original) && path.normalize(original) !== path.normalize(target)) {
        await fs.rm(original, { force: true });
      }
    }

    sendJson(res, 200, {
      ok: true,
      path: `${category}/${slug}.md`,
      url: `/${category}/${slug}/`,
    });
    return;
  }

  if (method === 'DELETE' && route === '/posts') {
    const relative = url.searchParams.get('path') ?? '';
    const target = path.join(POSTS_DIR, relative);
    if (!relative.endsWith('.md') || !inside(POSTS_DIR, target)) {
      fail(res, 400, '文章路径无效');
      return;
    }
    await fs.rm(target, { force: true });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === 'POST' && route === '/upload') {
    const body = await readJsonBody(req);
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
      String(body.data ?? ''),
    );

    if (!match) {
      fail(res, 400, '图片格式不支持');
      return;
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      fail(res, 400, '图片大小需要在 12MB 以内');
      return;
    }

    const extension = imageExtension(buffer, mime);
    if (!extension) {
      fail(res, 400, '图片内容与格式不匹配');
      return;
    }

    const baseName = sanitizeSlug(String(body.filename ?? '').replace(/\.[^.]+$/, '')) || 'image';
    const fileName = `${baseName}-${Date.now().toString(36)}-${crypto
      .randomBytes(3)
      .toString('hex')}.${extension}`;
    const target = path.join(UPLOADS_DIR, fileName);

    if (!inside(UPLOADS_DIR, target)) {
      fail(res, 400, '图片路径无效');
      return;
    }

    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.writeFile(target, buffer);

    sendJson(res, 200, { ok: true, url: `/uploads/${fileName}` });
    return;
  }

  fail(res, 404, '接口不存在');
}

export default function studioApi() {
  return {
    name: 'echo-studio-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__studio/api', (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        handle(req, res).catch((error) => {
          const message = error instanceof Error ? error.message : '服务器错误';
          if (!res.headersSent) {
            fail(res, 500, message);
          } else {
            res.end();
          }
        });
      });
    },
  };
}
