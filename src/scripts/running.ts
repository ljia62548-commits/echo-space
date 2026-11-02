const RUN_KEY = 'echo-space.running-100.v1';

type RunState = {
  checked: number[];
  note: string;
};

function loadRunState(): RunState {
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return { checked: [], note: '' };
    const parsed = JSON.parse(raw) as Partial<RunState>;
    const checked = Array.isArray(parsed.checked)
      ? [...new Set(parsed.checked)]
          .map(Number)
          .filter((day) => Number.isInteger(day) && day >= 1 && day <= 100)
          .sort((a, b) => a - b)
      : [];

    return {
      checked,
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return { checked: [], note: '' };
  }
}

function saveRunState(state: RunState): void {
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(state));
  } catch {
    // Keep the table usable if storage is unavailable.
  }
}

export function initRunningChallenge(): void {
  const root = document.querySelector<HTMLElement>('[data-run-challenge]');
  if (!root) return;

  const grid = root.querySelector<HTMLElement>('[data-run-grid]');
  const progress = root.querySelector<HTMLElement>('[data-run-progress]');
  const note = root.querySelector<HTMLTextAreaElement>('[data-run-note]');
  if (!grid || !progress || !note) return;

  let state = loadRunState();
  const buttons: HTMLButtonElement[] = [];

  const updateProgress = (): void => {
    progress.textContent = `${state.checked.length} / 100`;
  };

  const updateButton = (button: HTMLButtonElement): void => {
    const day = Number(button.dataset.day);
    const done = state.checked.includes(day);
    button.setAttribute('aria-pressed', String(done));
    button.setAttribute('aria-label', `第 ${day} 天，${done ? '已打卡' : '未打卡'}`);
  };

  for (let day = 1; day <= 100; day += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'run-day';
    button.dataset.day = String(day);
    button.innerHTML = `
      <span class="run-day__num">${day}</span>
      <span class="run-day__box" aria-hidden="true"></span>
    `;
    button.addEventListener('click', () => {
      if (state.checked.includes(day)) {
        state.checked = state.checked.filter((item) => item !== day);
      } else {
        state.checked = [...state.checked, day].sort((a, b) => a - b);
      }
      saveRunState(state);
      updateButton(button);
      updateProgress();
    });
    updateButton(button);
    buttons.push(button);
    grid.append(button);
  }

  note.value = state.note;
  let noteTimer = 0;
  note.addEventListener('input', () => {
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => {
      state.note = note.value;
      saveRunState(state);
    }, 250);
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== RUN_KEY) return;
    state = loadRunState();
    note.value = state.note;
    buttons.forEach(updateButton);
    updateProgress();
  });

  updateProgress();
}
