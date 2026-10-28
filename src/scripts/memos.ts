const STORAGE_KEY = 'echo-space.memos.v1';

type Memo = {
  id: string;
  text: string;
  done: boolean;
};

type MemoState = {
  date: string;
  items: Memo[];
};

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadState(): MemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: localDateKey(), items: [] };
    const parsed = JSON.parse(raw) as Partial<MemoState>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter(
            (item): item is Memo =>
              Boolean(item) &&
              typeof item.id === 'string' &&
              typeof item.text === 'string' &&
              typeof item.done === 'boolean',
          )
          .map((item) => ({ ...item, text: item.text.slice(0, 120) }))
      : [];

    return {
      date: typeof parsed.date === 'string' ? parsed.date : localDateKey(),
      items,
    };
  } catch {
    return { date: localDateKey(), items: [] };
  }
}

function saveState(state: MemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full storage quota: keep the board usable in memory.
  }
}

function rollover(state: MemoState): boolean {
  const today = localDateKey();
  if (state.date === today) return false;

  state.items = state.items.filter((item) => !item.done);
  state.date = today;
  saveState(state);
  return true;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function initMemos(): void {
  const board = document.querySelector<HTMLElement>('[data-memo-board]');
  const form = document.querySelector<HTMLFormElement>('[data-memo-form]');
  const input = document.querySelector<HTMLInputElement>('[data-memo-input]');
  const list = document.querySelector<HTMLUListElement>('[data-memo-list]');

  if (!board || !form || !input || !list) {
    return;
  }

  let state = loadState();
  rollover(state);

  const render = (): void => {
    list.replaceChildren();

    for (const item of state.items) {
      const row = document.createElement('li');
      row.className = `memo-item${item.done ? ' is-done' : ''}`;
      row.dataset.memoId = item.id;

      const toggle = document.createElement('button');
      toggle.className = 'memo-check';
      toggle.type = 'button';
      toggle.dataset.memoToggle = '';
      toggle.setAttribute('role', 'checkbox');
      toggle.setAttribute('aria-checked', String(item.done));
      toggle.setAttribute(
        'aria-label',
        item.done ? `取消划掉：${item.text}` : `划掉：${item.text}`,
      );

      const text = document.createElement('span');
      text.className = 'memo-text';
      text.textContent = item.text;

      row.append(toggle, text);
      list.append(row);
    }
  };

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLElement>('[data-memo-toggle]');
    if (!button) return;

    const row = button.closest<HTMLElement>('[data-memo-id]');
    const rolled = rollover(state);
    const item = state.items.find((entry) => entry.id === row?.dataset.memoId);
    if (!item) {
      if (rolled) render();
      return;
    }

    item.done = !item.done;
    saveState(state);
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    rollover(state);

    const text = input.value.trim();
    if (!text) return;

    state.items.push({ id: makeId(), text: text.slice(0, 120), done: false });
    saveState(state);
    input.value = '';
    render();
    input.focus();
  });

  let midnightTimer = 0;

  const scheduleMidnight = (): void => {
    window.clearTimeout(midnightTimer);
    const now = new Date();
    const next = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      100,
    );
    midnightTimer = window.setTimeout(() => {
      if (rollover(state)) render();
      scheduleMidnight();
    }, Math.max(1000, next.getTime() - now.getTime()));
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (rollover(state)) render();
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = loadState();
    rollover(state);
    render();
  });

  render();
  scheduleMidnight();
}
