/* Echo Space — small, dependency-free client behaviours. */

import { initMemos } from './memos';

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

function initTypewriter(): void {
  const elements = qsa<HTMLElement>('[data-typewriter]');
  if (elements.length === 0) return;

  const texts = elements.map((element) => element.dataset.text ?? element.textContent ?? '');
  const columns = elements.map((element) => element.closest('.hero__column') as HTMLElement | null);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    elements.forEach((element, index) => {
      element.textContent = texts[index];
    });
    return;
  }

  let elementIndex = 0;
  let charIndex = 0;
  let timer = 0;
  let stopped = false;

  const setActiveColumn = (activeIndex: number): void => {
    columns.forEach((column, index) => {
      column?.classList.toggle('is-typing', index === activeIndex);
    });
  };

  const reveal = (): void => {
    stopped = true;
    window.clearTimeout(timer);
    elements.forEach((element, index) => {
      element.textContent = texts[index];
    });
    columns.forEach((column) => column?.classList.remove('is-typing'));
  };

  const step = (): void => {
    if (stopped) return;

    const element = elements[elementIndex];
    const text = texts[elementIndex];
    if (!element) return;

    charIndex += 1;
    element.textContent = text.slice(0, charIndex);
    setActiveColumn(elementIndex);

    if (charIndex < text.length) {
      timer = window.setTimeout(step, 68 + Math.random() * 34);
    } else if (elementIndex < elements.length - 1) {
      elementIndex += 1;
      charIndex = 0;
      timer = window.setTimeout(step, 260);
    }
  };

  elements.forEach((element) => {
    element.textContent = '';
  });

  timer = window.setTimeout(step, 520);
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

function initSidebarSearch(): void {
  const root = qs<HTMLElement>('[data-sidebar-search]');
  const input = qs<HTMLInputElement>('[data-search-input]', root ?? document);
  const panel = qs<HTMLElement>('[data-search-panel]', root ?? document);
  const results = qs<HTMLElement>('[data-search-results]', root ?? document);
  const hint = qs<HTMLElement>('[data-search-hint]', root ?? document);
  const clear = qs<HTMLButtonElement>('[data-search-clear]', root ?? document);

  if (!root || !input || !panel || !results || !hint || !clear) return;

  let items: SearchItem[] | null = null;
  let loading = false;
  let activeIndex = -1;
  let links: HTMLAnchorElement[] = [];

  const open = (): void => {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const close = (): void => {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  };

  const render = (query: string): void => {
    clear.hidden = query.length === 0;
    results.replaceChildren();
    links = [];
    activeIndex = -1;

    if (!items) {
      hint.textContent = '正在读取文章索引…';
      return;
    }

    const normalized = query.trim().toLowerCase();
    const matched = normalized
      ? items.filter((item) =>
          [item.title, item.description, item.categoryLabel, item.tags.join(' ')]
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        )
      : items.slice(0, 6);

    hint.textContent = normalized
      ? `${matched.length} 条结果`
      : `${items.length} 篇文章`;

    if (matched.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'sidebar-search__empty';
      empty.textContent = items.length === 0 ? '还没有文章。' : '没有找到匹配的文章。';
      results.append(empty);
      return;
    }

    for (const item of matched) {
      const link = document.createElement('a');
      link.className = 'sidebar-search__result';
      link.href = item.url;

      const meta = document.createElement('span');
      meta.className = 'sidebar-search__result-meta';
      meta.textContent = item.categoryLabel;

      const title = document.createElement('span');
      title.className = 'sidebar-search__result-title';
      title.textContent = item.title;

      link.append(meta, title);
      results.append(link);
      links.push(link);
    }
  };

  const load = async (): Promise<void> => {
    if (items || loading) return;
    loading = true;

    try {
      const response = await fetch('/search-index.json', {
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error('索引加载失败');
      items = (await response.json()) as SearchItem[];
      render(input.value);
    } catch {
      hint.textContent = '搜索索引加载失败，请刷新后重试。';
    } finally {
      loading = false;
    }
  };

  input.addEventListener('focus', () => {
    open();
    void load();
  });

  input.addEventListener('input', () => {
    open();
    void load();
    render(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      input.value = '';
      render('');
      close();
      input.blur();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (links.length === 0) return;
      event.preventDefault();
      links.forEach((link) => link.classList.remove('is-active'));
      activeIndex =
        event.key === 'ArrowDown'
          ? (activeIndex + 1) % links.length
          : (activeIndex - 1 + links.length) % links.length;
      links[activeIndex].classList.add('is-active');
      links[activeIndex].scrollIntoView({ block: 'nearest' });
      return;
    }

    if (event.key === 'Enter') {
      const target = links[activeIndex] ?? links[0];
      if (target) {
        event.preventDefault();
        window.location.href = target.href;
      }
    }
  });

  clear.addEventListener('click', () => {
    input.value = '';
    render('');
    input.focus();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!root.contains(event.target as Node)) close();
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null;
    const typing =
      target &&
      (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      open();
      void load();
      return;
    }

    if (!typing && event.key === '/') {
      event.preventDefault();
      input.focus();
      open();
      void load();
    }
  });
}

/* ------------------------------------------------------------------ */
function boot(): void {
  initNav();
  initScrollState();
  initReveal();
  initTypewriter();
  initCodeCopy();
  initCopyLink();
  initToc();
  initSidebarSearch();
  initMemos();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
