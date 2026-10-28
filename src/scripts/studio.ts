/* Echo Space Studio — local dashboard logic. No framework, no network calls
   beyond the local editing API. */

type SiteData = {
  name: string;
  author: string;
  description: string;
  footerNote: string;
  hero: {
    line: string;
    image: string;
    position: string;
    overlay: number;
  };
  nav: Array<{
    key: string;
    label: string;
    href: string;
    description: string;
  }>;
  social: Array<{ label: string; href: string }>;
};

type ProfileData = {
  name: string;
  monogram: string;
  headline: string;
  intro: string;
  location: string;
  status: string;
  avatar: string;
  bio: string[];
  interests: string[];
  toolbox: Array<{ group: string; items: string[] }>;
  timeline: Array<{ date: string; title: string; description: string }>;
  now: { building: string; learning: string; playing: string };
  links: Array<{ label: string; href: string }>;
};

type PostRecord = {
  path: string;
  category: string;
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  cover: string;
  body: string;
};

type StudioState = {
  site: SiteData;
  profile: ProfileData;
  posts: PostRecord[];
};

const qs = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector(selector) as T | null;

const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  [...root.querySelectorAll(selector)] as T[];

const state: {
  site: SiteData | null;
  profile: ProfileData | null;
  posts: PostRecord[];
  currentPath: string | null;
} = {
  site: null,
  profile: null,
  posts: [],
  currentPath: null,
};

let toastTimer = 0;

function toast(message: string, isError = false): void {
  const element = qs<HTMLElement>('[data-toast]');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('is-error', isError);
  element.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('is-visible'), 3200);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'content-type': 'application/json' } : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function initTabs(): void {
  const tabs = qsa<HTMLButtonElement>('[data-tab]');
  const panels = qsa<HTMLElement>('[data-panel]');

  const show = (name: string): void => {
    tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.tab === name));
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    if (window.location.hash !== `#${name}`) {
      window.history.replaceState(null, '', `#${name}`);
    }
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.tab ?? 'posts')));

  const initial = window.location.hash.replace('#', '');
  if (['posts', 'site', 'profile'].includes(initial)) show(initial);

  window.addEventListener('hashchange', () => {
    const name = window.location.hash.replace('#', '');
    if (['posts', 'site', 'profile'].includes(name)) show(name);
  });
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

function postItem(post: PostRecord): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'studio-post-item';
  button.dataset.path = post.path;

  const title = document.createElement('span');
  title.className = 'studio-post-item__title';
  title.textContent = post.title || '(未命名)';

  const meta = document.createElement('span');
  meta.className = 'studio-post-item__meta';
  const category = state.site?.nav.find((item) => item.key === post.category)?.label ?? post.category;
  meta.textContent = `${post.date || '—'} · ${category}`;

  if (post.draft) {
    const badge = document.createElement('em');
    badge.className = 'studio-post-item__draft';
    badge.textContent = 'DRAFT';
    meta.append(badge);
  }

  button.append(title, meta);
  button.addEventListener('click', () => {
    const found = state.posts.find((item) => item.path === post.path);
    if (found) loadPost(found);
  });

  return button;
}

function renderPosts(posts: PostRecord[]): void {
  state.posts = posts;
  const list = qs<HTMLElement>('[data-post-list]');
  const count = qs<HTMLElement>('[data-post-count]');
  if (!list) return;

  if (count) count.textContent = String(posts.length);

  list.replaceChildren();

  if (posts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'studio-muted';
    empty.textContent = '还没有文章。点「新建」开始。';
    list.append(empty);
    return;
  }

  for (const post of posts) {
    const item = postItem(post);
    item.classList.toggle('is-active', post.path === state.currentPath);
    list.append(item);
  }
}

function setPostStatus(message: string): void {
  const element = qs<HTMLElement>('[data-post-status]');
  if (element) element.textContent = message;
}

function loadPost(post: PostRecord): void {
  state.currentPath = post.path;

  qs<HTMLInputElement>('[data-post-original]')!.value = post.path;
  qs<HTMLInputElement>('[data-post-title]')!.value = post.title;
  qs<HTMLInputElement>('[data-post-slug]')!.value = post.slug;
  qs<HTMLSelectElement>('[data-post-category]')!.value = post.category;
  qs<HTMLInputElement>('[data-post-date]')!.value = post.date;
  qs<HTMLInputElement>('[data-post-tags]')!.value = post.tags.join(', ');
  qs<HTMLTextAreaElement>('[data-post-description]')!.value = post.description;
  qs<HTMLInputElement>('[data-post-cover]')!.value = post.cover;
  qs<HTMLTextAreaElement>('[data-post-body]')!.value = post.body;
  qs<HTMLInputElement>('[data-post-featured]')!.checked = post.featured;
  qs<HTMLInputElement>('[data-post-draft]')!.checked = post.draft;

  const mode = qs<HTMLElement>('[data-editor-mode]');
  const title = qs<HTMLElement>('.studio-editor__title');
  if (mode) mode.textContent = 'Edit entry';
  if (title) title.textContent = '编辑文章';

  const preview = qs<HTMLAnchorElement>('[data-post-preview]');
  if (preview) {
    preview.hidden = false;
    preview.href = `/${post.category}/${post.slug}/`;
  }

  const del = qs<HTMLButtonElement>('[data-delete-post]');
  if (del) del.hidden = false;

  qsa<HTMLElement>('.studio-post-item').forEach((item) => {
    item.classList.toggle('is-active', (item as HTMLElement).dataset.path === post.path);
  });

  setPostStatus('已保存');
}

function resetPostForm(): void {
  state.currentPath = null;
  const form = qs<HTMLFormElement>('[data-post-form]');
  form?.reset();

  qs<HTMLInputElement>('[data-post-original]')!.value = '';
  qs<HTMLInputElement>('[data-post-slug]')!.value = '';
  qs<HTMLInputElement>('[data-post-tags]')!.value = '';
  qs<HTMLInputElement>('[data-post-date]')!.value = new Date().toISOString().slice(0, 10);
  qs<HTMLTextAreaElement>('[data-post-body]')!.value = '';

  const category = qs<HTMLSelectElement>('[data-post-category]');
  if (category && state.site?.nav[1]) category.value = state.site.nav[1].key;

  const mode = qs<HTMLElement>('[data-editor-mode]');
  const title = qs<HTMLElement>('.studio-editor__title');
  if (mode) mode.textContent = 'New entry';
  if (title) title.textContent = '写一篇新的';

  const preview = qs<HTMLAnchorElement>('[data-post-preview]');
  if (preview) preview.hidden = true;

  const del = qs<HTMLButtonElement>('[data-delete-post]');
  if (del) del.hidden = true;

  setPostStatus('尚未保存');
  qsa<HTMLElement>('.studio-post-item').forEach((item) => item.classList.remove('is-active'));
  qs<HTMLInputElement>('[data-post-title]')?.focus();
}

function splitList(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function slugify(title: string, date: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);

  if (base) return base;
  return `post-${date.replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
}

async function refreshPosts(): Promise<void> {
  const data = await api<{ posts: PostRecord[] }>('/__studio/api/posts');
  renderPosts(data.posts);
}

function initPostForm(): void {
  const form = qs<HTMLFormElement>('[data-post-form]');
  if (!form) return;

  const save = async (): Promise<void> => {
    const title = qs<HTMLInputElement>('[data-post-title]')!.value.trim();
    const date = qs<HTMLInputElement>('[data-post-date]')!.value;
    if (!title) {
      toast('先给文章起个标题', true);
      qs<HTMLInputElement>('[data-post-title]')?.focus();
      return;
    }

    let slug = qs<HTMLInputElement>('[data-post-slug]')!.value.trim();
    if (!slug) {
      slug = slugify(title, date);
      qs<HTMLInputElement>('[data-post-slug]')!.value = slug;
    }

    const payload = {
      originalPath: qs<HTMLInputElement>('[data-post-original]')!.value || undefined,
      title,
      slug,
      category: qs<HTMLSelectElement>('[data-post-category]')!.value,
      date,
      tags: splitList(qs<HTMLInputElement>('[data-post-tags]')!.value),
      description: qs<HTMLTextAreaElement>('[data-post-description]')!.value.trim(),
      cover: qs<HTMLInputElement>('[data-post-cover]')!.value.trim(),
      featured: qs<HTMLInputElement>('[data-post-featured]')!.checked,
      draft: qs<HTMLInputElement>('[data-post-draft]')!.checked,
      body: qs<HTMLTextAreaElement>('[data-post-body]')!.value,
    };

    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
      const result = await api<{ ok: boolean; path: string; url: string }>(
        '/__studio/api/posts',
        { method: 'POST', body: JSON.stringify(payload) },
      );

      state.currentPath = result.path;
      qs<HTMLInputElement>('[data-post-original]')!.value = result.path;

      const preview = qs<HTMLAnchorElement>('[data-post-preview]');
      if (preview) {
        preview.hidden = false;
        preview.href = result.url;
      }
      const del = qs<HTMLButtonElement>('[data-delete-post]');
      if (del) del.hidden = false;

      await refreshPosts();
      setPostStatus('已保存');
      toast('文章已写入本地文件');
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void save();
  });

  form.addEventListener('input', () => setPostStatus('有未保存的修改'));

  qs<HTMLButtonElement>('[data-new-post]')?.addEventListener('click', resetPostForm);

  qs<HTMLButtonElement>('[data-delete-post]')?.addEventListener('click', async () => {
    const original = qs<HTMLInputElement>('[data-post-original]')?.value;
    if (!original) return;
    if (!window.confirm('确定删除这篇文章？此操作会直接删除本地文件，无法撤销。')) return;

    try {
      await api(`/__studio/api/posts?path=${encodeURIComponent(original)}`, {
        method: 'DELETE',
      });
      resetPostForm();
      await refreshPosts();
      toast('文章已删除');
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', true);
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      if (!document.querySelector('[data-panel="posts"]:not([hidden])')) return;
      event.preventDefault();
      void save();
    }
  });
}

/* ------------------------------------------------------------------ */
/* Repeaters                                                           */
/* ------------------------------------------------------------------ */

function addRepeat(listSelector: string, templateSelector: string): void {
  const list = qs<HTMLElement>(listSelector);
  const template = qs<HTMLTemplateElement>(templateSelector);
  if (!list || !template) return;

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  list.append(fragment);

  const added = list.lastElementChild as HTMLElement | null;
  added?.querySelector<HTMLInputElement>('input')?.focus();
}

function initRepeaters(): void {
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLButtonElement>('[data-remove-row]');
    if (remove) {
      remove.closest('[data-repeat]')?.remove();
    }
  });

  qs<HTMLButtonElement>('[data-add-social]')?.addEventListener('click', () =>
    addRepeat('[data-social-list]', '[data-social-template]'),
  );
  qs<HTMLButtonElement>('[data-add-toolbox]')?.addEventListener('click', () =>
    addRepeat('[data-toolbox-list]', '[data-toolbox-template]'),
  );
  qs<HTMLButtonElement>('[data-add-timeline]')?.addEventListener('click', () =>
    addRepeat('[data-timeline-list]', '[data-timeline-template]'),
  );
  qs<HTMLButtonElement>('[data-add-link]')?.addEventListener('click', () =>
    addRepeat('[data-links-list]', '[data-link-template]'),
  );
}

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

async function uploadImage(file: File): Promise<string> {
  if (file.size > 12 * 1024 * 1024) throw new Error('图片超过 12MB');
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('只支持 JPG / PNG / WebP');

  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });

  const result = await api<{ url: string }>('/__studio/api/upload', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, data }),
  });

  return result.url;
}

function initSiteForm(): void {
  const overlay = qs<HTMLInputElement>('[data-site-overlay]');
  const overlayValue = qs<HTMLElement>('[data-site-overlay-value]');
  const position = qs<HTMLSelectElement>('[data-site-position]');
  const preview = qs<HTMLImageElement>('[data-site-wallpaper-preview]');
  const fileInput = qs<HTMLInputElement>('[data-site-wallpaper-file]');

  let wallpaperFile: File | null = null;

  overlay?.addEventListener('input', () => {
    if (overlayValue) overlayValue.textContent = `${overlay.value}%`;
  });

  position?.addEventListener('change', () => {
    preview?.style.setProperty('object-position', position.value);
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    wallpaperFile = file;
    const url = URL.createObjectURL(file);
    if (preview) preview.src = url;
    const status = qs<HTMLElement>('[data-site-status]');
    if (status) status.textContent = '壁纸待保存';
  });

  qs<HTMLButtonElement>('[data-save-site]')?.addEventListener('click', async () => {
    if (!state.site) return;

    const button = qs<HTMLButtonElement>('[data-save-site]');
    if (button) {
      button.disabled = true;
      button.textContent = '保存中…';
    }

    try {
      let image: string | undefined;
      if (wallpaperFile) {
        image = await uploadImage(wallpaperFile);
      }

      const nav = state.site.nav.map((item) => {
        const row = qs<HTMLElement>(`[data-nav-key="${item.key}"]`);
        return {
          ...item,
          label: row?.querySelector<HTMLInputElement>('[data-nav-label]')?.value.trim() || item.label,
          description:
            row?.querySelector<HTMLInputElement>('[data-nav-description]')?.value.trim() ||
            item.description,
        };
      });

      const social = qsa<HTMLElement>('[data-social-list] [data-repeat]')
        .map((row) => ({
          label: row.querySelector<HTMLInputElement>('[data-social-label]')?.value.trim() ?? '',
          href: row.querySelector<HTMLInputElement>('[data-social-href]')?.value.trim() ?? '',
        }))
        .filter((link) => link.label && link.href);

      const patch = {
        name: qs<HTMLInputElement>('[data-site-name]')?.value.trim(),
        author: qs<HTMLInputElement>('[data-site-author]')?.value.trim(),
        description: qs<HTMLTextAreaElement>('[data-site-description]')?.value.trim(),
        footerNote: qs<HTMLInputElement>('[data-site-footer]')?.value.trim(),
        hero: {
          line: qs<HTMLTextAreaElement>('[data-site-line]')?.value.trim(),
          overlay: overlay ? Number(overlay.value) / 100 : state.site.hero.overlay,
          position: position?.value ?? state.site.hero.position,
          ...(image ? { image, updatedAt: new Date().toISOString() } : {}),
        },
        nav,
        social,
      };

      await api('/__studio/api/site', { method: 'POST', body: JSON.stringify({ patch }) });
      toast('站点设置已保存');
      wallpaperFile = null;
      if (button) button.textContent = '已保存';
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', true);
      if (button) {
        button.disabled = false;
        button.textContent = '保存站点设置';
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

function initProfileForm(): void {
  qs<HTMLButtonElement>('[data-save-profile]')?.addEventListener('click', async () => {
    const button = qs<HTMLButtonElement>('[data-save-profile]');
    if (button) {
      button.disabled = true;
      button.textContent = '保存中…';
    }

    try {
      const toolbox = qsa<HTMLElement>('[data-toolbox-list] [data-repeat]')
        .map((row) => ({
          group: row.querySelector<HTMLInputElement>('[data-toolbox-group]')?.value.trim() ?? '',
          items: splitList(
            row.querySelector<HTMLInputElement>('[data-toolbox-items]')?.value ?? '',
          ),
        }))
        .filter((group) => group.group || group.items.length > 0);

      const timeline = qsa<HTMLElement>('[data-timeline-list] [data-repeat]')
        .map((row) => ({
          date: row.querySelector<HTMLInputElement>('[data-timeline-date]')?.value.trim() ?? '',
          title: row.querySelector<HTMLInputElement>('[data-timeline-title]')?.value.trim() ?? '',
          description:
            row.querySelector<HTMLInputElement>('[data-timeline-description]')?.value.trim() ?? '',
        }))
        .filter((item) => item.title || item.date);

      const links = qsa<HTMLElement>('[data-links-list] [data-repeat]')
        .map((row) => ({
          label: row.querySelector<HTMLInputElement>('[data-link-label]')?.value.trim() ?? '',
          href: row.querySelector<HTMLInputElement>('[data-link-href]')?.value.trim() ?? '',
        }))
        .filter((link) => link.label && link.href);

      const bio = (qs<HTMLTextAreaElement>('[data-profile-bio]')?.value ?? '')
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

      const patch = {
        name: qs<HTMLInputElement>('[data-profile-name]')?.value.trim(),
        monogram: qs<HTMLInputElement>('[data-profile-monogram]')?.value.trim(),
        headline: qs<HTMLInputElement>('[data-profile-headline]')?.value.trim(),
        intro: qs<HTMLTextAreaElement>('[data-profile-intro]')?.value.trim(),
        location: qs<HTMLInputElement>('[data-profile-location]')?.value.trim(),
        status: qs<HTMLInputElement>('[data-profile-status]')?.value.trim(),
        avatar: qs<HTMLInputElement>('[data-profile-avatar]')?.value.trim(),
        bio,
        interests: splitList(qs<HTMLInputElement>('[data-profile-interests]')?.value ?? ''),
        toolbox,
        timeline,
        links,
        now: {
          building: qs<HTMLTextAreaElement>('[data-now-building]')?.value.trim(),
          learning: qs<HTMLTextAreaElement>('[data-now-learning]')?.value.trim(),
          playing: qs<HTMLTextAreaElement>('[data-now-playing]')?.value.trim(),
        },
      };

      await api('/__studio/api/profile', { method: 'POST', body: JSON.stringify({ patch }) });
      toast('关于我已保存');
      if (button) button.textContent = '已保存';
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', true);
      if (button) {
        button.disabled = false;
        button.textContent = '保存关于我';
      }
    }
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot(): Promise<void> {
  initTabs();
  initRepeaters();
  initPostForm();
  initSiteForm();
  initProfileForm();

  try {
    const data = await api<StudioState>('/__studio/api/state');
    state.site = data.site;
    state.profile = data.profile;
    renderPosts(data.posts);

    if (data.posts[0]) {
      loadPost(data.posts[0]);
    }
  } catch (error) {
    const list = qs<HTMLElement>('[data-post-list]');
    if (list) {
      list.innerHTML = '';
      const message = document.createElement('p');
      message.className = 'studio-muted';
      message.textContent =
        '无法连接本地编辑接口。请通过 npm run dev 启动站点，并在 localhost 打开此页。';
      list.append(message);
    }
    toast(error instanceof Error ? error.message : '读取失败', true);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
} else {
  void boot();
}
