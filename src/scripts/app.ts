/* Echo Space — small, dependency-free client behaviours. */

type Json = Record<string, unknown>;

const qs = <T extends Element>(selector: string, root: ParentNode = document): T | null =>
  root.querySelector(selector) as T | null;

const qsa = <T extends Element>(selector: string, root: ParentNode = document): T[] =>
  [...root.querySelectorAll(selector)] as T[];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function initNav(): void {
  const toggle = qs<HTMLButtonElement>('[data-nav-toggle]');
  const overlay = qs<HTMLElement>('[data-nav-overlay]');
  const sidebar = qs<HTMLElement>('[data-sidebar]');

  if (!toggle || !sidebar) return;

  const setOpen = (open: boolean): void => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  };

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('nav-open'));
  });

  overlay?.addEventListener('click', () => setOpen(false));

  qsa<HTMLAnchorElement>('[data-nav-link]', sidebar).forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setOpen(false);
  });
}

/* ------------------------------------------------------------------ */
/* Scroll state + reveal + reading progress                            */
/* ------------------------------------------------------------------ */

function initScrollState(): void {
  const sidebar = qs<HTMLElement>('[data-sidebar]');
  const mobileBar = qs<HTMLElement>('[data-mobile-bar]');
  const progress = qs<HTMLElement>('.read-progress');

  const update = (): void => {
    const scrolled = window.scrollY > 18;
    sidebar?.setAttribute('data-scrolled', String(scrolled));
    mobileBar?.setAttribute('data-scrolled', String(scrolled));

    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progress.style.width = `${ratio * 100}%`;
    }
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}

function initReveal(): void {
  const items = qsa<HTMLElement>('[data-reveal]');
  if (items.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
  );

  items.forEach((item) => observer.observe(item));
}

function initLocalTime(): void {
  const targets = qsa<HTMLElement>('[data-local-time]');
  if (targets.length === 0) return;

  const format = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const tick = (): void => {
    const now = new Date();
    targets.forEach((target) => {
      target.textContent = format.format(now);
      target.setAttribute('datetime', now.toISOString());
      target.title = now.toLocaleString('zh-CN');
    });
  };

  tick();
  window.setInterval(tick, 30_000);
}

/* ------------------------------------------------------------------ */
/* Article niceties                                                    */
/* ------------------------------------------------------------------ */

function initCodeCopy(): void {
  qsa<HTMLPreElement>('.prose pre').forEach((pre) => {
    if (pre.querySelector('.copy-code')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = 'COPY';

    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.innerText ?? pre.innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'COPIED';
      } catch {
        button.textContent = 'FAILED';
      }
      window.setTimeout(() => {
        button.textContent = 'COPY';
      }, 1600);
    });

    pre.append(button);
  });
}

function initCopyLink(): void {
  const button = qs<HTMLButtonElement>('[data-copy-link]');
  if (!button) return;

  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = 'Copied ✓';
    } catch {
      button.textContent = 'Copy failed';
    }
    window.setTimeout(() => {
      button.textContent = 'Copy link ↗';
    }, 1800);
  });
}

function initToc(): void {
  const links = qsa<HTMLAnchorElement>('.article-toc a');
  if (links.length === 0) return;

  const headings = links
    .map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1))))
    .filter((heading): heading is HTMLElement => Boolean(heading));

  if (headings.length === 0 || !('IntersectionObserver' in window)) return;

  const setActive = (id: string): void => {
    links.forEach((link) => {
      link.classList.toggle('is-active', link.hash === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActive(visible[0].target.id);
    },
    { rootMargin: '-12% 0px -72% 0px', threshold: 0 },
  );

  headings.forEach((heading) => observer.observe(heading));
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

interface SearchItem {
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  url: string;
  date: string;
}

function initSearch(): void {
  const input = qs<HTMLInputElement>('[data-search-input]');
  const status = qs<HTMLElement>('[data-search-status]');
  const results = qs<HTMLElement>('[data-search-results]');
  const data = qs<HTMLScriptElement>('#search-index');

  if (!input || !status || !results || !data) return;

  let items: SearchItem[] = [];
  try {
    items = JSON.parse(data.textContent ?? '[]') as SearchItem[];
  } catch {
    return;
  }

  const render = (query: string): void => {
    const normalized = query.trim().toLowerCase();
    const matched = normalized
      ? items.filter((item) => {
          const haystack = [
            item.title,
            item.description,
            item.categoryLabel,
            item.tags.join(' '),
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(normalized);
        })
      : items.slice(0, 8);

    status.textContent = normalized
      ? `${matched.length} 条结果${matched.length === 0 ? ' — 换个词试试' : ''}`
      : `最近更新 · 共 ${items.length} 篇`;

    results.replaceChildren();

    if (matched.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = '没有找到匹配的文章。';
      results.append(empty);
      return;
    }

    for (const item of matched) {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.url;

      const category = document.createElement('span');
      category.className = 'search-result__cat';
      category.textContent = item.categoryLabel;

      const main = document.createElement('span');
      const title = document.createElement('span');
      title.className = 'search-result__title';
      title.textContent = item.title;

      const description = document.createElement('span');
      description.className = 'search-result__desc';
      description.textContent = item.description;

      main.append(title, description);
      link.append(category, main);
      results.append(link);
    }
  };

  const params = new URLSearchParams(window.location.search);
  const initial = params.get('q') ?? '';
  input.value = initial;
  render(initial);

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      render('');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Local edit mode                                                     */
/* ------------------------------------------------------------------ */

type Patch = Record<string, unknown>;

function buildPatch(bindings: { path: string; value: string }[]): {
  site: Patch;
  profile: Patch;
} {
  const site: Patch = {};
  const profile: Patch = {};

  const assign = (root: Patch, segments: string[], value: string): void => {
    let cursor: Record<string, unknown> = root;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      const next = cursor[key];
      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;
  };

  for (const binding of bindings) {
    const segments = binding.path.split('.').filter(Boolean);
    if (segments.length < 2) continue;
    if (segments[0] === 'site') assign(site, segments.slice(1), binding.value);
    if (segments[0] === 'profile') assign(profile, segments.slice(1), binding.value);
  }

  return { site, profile };
}

function ensureToast(): HTMLElement {
  let toast = qs<HTMLElement>('[data-toast]');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.dataset.toast = '';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  return toast;
}

function showToast(message: string, isError = false): void {
  const toast = ensureToast();
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function initEditMode(): void {
  const dock = qs<HTMLElement>('[data-edit-dock]');
  if (!dock) return;

  const toggle = qs<HTMLButtonElement>('[data-edit-toggle]', dock);
  const panel = qs<HTMLElement>('[data-edit-panel]', dock);
  const saveButton = qs<HTMLButtonElement>('[data-edit-save]', dock);
  const cancelButton = qs<HTMLButtonElement>('[data-edit-cancel]', dock);
  const dialog = qs<HTMLDialogElement>('[data-wallpaper-dialog]');
  const openWallpaperButtons = qsa<HTMLButtonElement>('[data-open-wallpaper]');
  const closeDialogButtons = dialog ? qsa<HTMLButtonElement>('[data-close-dialog]', dialog) : [];
  const fileInput = dialog ? qs<HTMLInputElement>('[data-wallpaper-file]', dialog) : null;
  const overlayInput = dialog ? qs<HTMLInputElement>('[data-wallpaper-overlay]', dialog) : null;
  const overlayValue = dialog ? qs<HTMLElement>('[data-overlay-value]', dialog) : null;
  const positionSelect = dialog ? qs<HTMLSelectElement>('[data-wallpaper-position]', dialog) : null;
  const preview = dialog ? qs<HTMLImageElement>('[data-wallpaper-preview]', dialog) : null;
  const previewBox = preview?.parentElement ?? null;
  const applyButton = dialog ? qs<HTMLButtonElement>('[data-apply-wallpaper]', dialog) : null;

  if (!toggle || !panel) return;

  let editing = false;
  let dirty = false;
  let selectedFile: File | null = null;
  let previewUrl: string | null = null;

  const bindings = (): HTMLElement[] => qsa<HTMLElement>('[data-bind]');

  const setEditing = (next: boolean): void => {
    editing = next;
    document.body.classList.toggle('is-editing', next);
    toggle.setAttribute('aria-pressed', String(next));
    toggle.textContent = next ? '保存并退出' : '编辑页面';
    toggle.disabled = false;
    panel.hidden = !next;

    for (const element of bindings()) {
      if (next) {
        element.setAttribute('contenteditable', 'true');
        element.setAttribute('spellcheck', 'false');
        element.addEventListener('input', markDirty);
        element.addEventListener('keydown', keepSingleLine);
      } else {
        element.removeAttribute('contenteditable');
        element.removeAttribute('spellcheck');
        element.removeEventListener('input', markDirty);
        element.removeEventListener('keydown', keepSingleLine);
      }
    }

    if (next) {
      showToast('编辑模式已开启 — 点击虚线文字修改');
    }
  };

  const markDirty = (): void => {
    dirty = true;
  };

  const keepSingleLine = (event: Event): void => {
    const keyboard = event as KeyboardEvent;
    if (keyboard.key === 'Enter') {
      event.preventDefault();
    }
  };

  toggle.addEventListener('click', () => {
    if (editing) {
      void saveEdits();
    } else {
      setEditing(true);
    }
  });

  cancelButton?.addEventListener('click', () => {
    dirty = false;
    window.location.reload();
  });

  const saveEdits = async (): Promise<void> => {
    const collected = bindings()
      .map((element) => ({
        path: element.dataset.bind ?? '',
        value: (element.innerText ?? '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((binding) => binding.path && binding.value);

    const { site, profile } = buildPatch(collected);

    if (Object.keys(site).length === 0 && Object.keys(profile).length === 0) {
      showToast('没有需要保存的内容', true);
      return;
    }

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = '保存中…';
    }
    toggle.disabled = true;

    try {
      if (Object.keys(site).length > 0) {
        await postJson('/__studio/api/site', { patch: site });
      }
      if (Object.keys(profile).length > 0) {
        await postJson('/__studio/api/profile', { patch: profile });
      }
      dirty = false;
      showToast('已保存 — 正在刷新');
      window.setTimeout(() => window.location.reload(), 550);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', true);
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = '保存更改';
      }
      toggle.disabled = false;
    }
  };

  saveButton?.addEventListener('click', () => {
    void saveEdits();
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      if (editing) {
        void saveEdits();
      } else {
        setEditing(true);
      }
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  /* ---- wallpaper dialog ---- */

  const openWallpaper = (): void => {
    if (!dialog) return;

    selectedFile = null;
    if (fileInput) fileInput.value = '';

    const currentImage = dialog.dataset.currentImage ?? '';
    const currentOverlay = Number(dialog.dataset.currentOverlay ?? 0.22);
    const currentPosition = dialog.dataset.currentPosition ?? '50% 38%';

    if (preview) {
      preview.src = currentImage;
      preview.style.setProperty('--preview-position', currentPosition);    }
    if (overlayInput) {
      overlayInput.value = String(Math.round(currentOverlay * 100));
    }
    if (overlayValue) {
      overlayValue.textContent = `${Math.round(currentOverlay * 100)}%`;
    }
    if (positionSelect) {
      positionSelect.value = currentPosition;
    }
    previewBox?.style.setProperty('--preview-overlay', String(currentOverlay));

    dialog.showModal();
  };

  openWallpaperButtons.forEach((button) => button.addEventListener('click', openWallpaper));
  closeDialogButtons.forEach((button) =>
    button.addEventListener('click', () => dialog?.close()),
  );

  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      showToast('图片超过 12MB，请换一张小一点的', true);
      fileInput.value = '';
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showToast('只支持 JPG / PNG / WebP', true);
      fileInput.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    selectedFile = file;
    if (preview) preview.src = previewUrl;
  });

  overlayInput?.addEventListener('input', () => {
    if (overlayValue) overlayValue.textContent = `${overlayInput.value}%`;
    previewBox?.style.setProperty('--preview-overlay', `${Number(overlayInput.value) / 100}`);
  });

  positionSelect?.addEventListener('change', () => {
    preview?.style.setProperty('--preview-position', positionSelect.value);
  });

  applyButton?.addEventListener('click', async () => {
    if (!dialog || !overlayInput || !positionSelect) return;

    applyButton.disabled = true;
    applyButton.textContent = '应用中…';

    try {
      let image: string | undefined;

      if (selectedFile) {
        const dataUrl = await readFileAsDataUrl(selectedFile);
        const result = await postJson<{ url: string }>('/__studio/api/upload', {
          filename: selectedFile.name,
          data: dataUrl,
        });
        image = result.url;
      }

      const patch: Patch = {
        hero: {
          overlay: Number(overlayInput.value) / 100,
          position: positionSelect.value,
          ...(image ? { image, updatedAt: new Date().toISOString() } : {}),
        },
      };

      await postJson('/__studio/api/site', { patch });
      dialog.dataset.currentImage = image ?? dialog.dataset.currentImage ?? '';
      dialog.dataset.currentOverlay = String(Number(overlayInput.value) / 100);
      dialog.dataset.currentPosition = positionSelect.value;
      dialog.close();
      showToast('壁纸已更新');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新壁纸失败', true);
      applyButton.disabled = false;
      applyButton.textContent = '应用';
    }
  });

  window.addEventListener('beforeunload', () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
}

async function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */

function boot(): void {
  initNav();
  initScrollState();
  initReveal();
  initLocalTime();
  initCodeCopy();
  initCopyLink();
  initToc();
  initSearch();
  initEditMode();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
