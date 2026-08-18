const STORAGE_KEYS = [
  'aws-aif-c01-results',
  'aws-aif-c01-used-questions',
  'aws-aif-c01-wrong-answers',
  'aws-aif-c01-daily-stats',
  'aws-aif-c01-streak',
  'aws-aif-c01-bookmarks',
  'flashcard-known',
];

function getAllLocalData(): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  return data;
}

function hasLocalData(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

function hasServerData(data: Record<string, unknown>): boolean {
  return Object.keys(data).length > 0;
}

function applyServerData(serverData: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(serverData)) {
    if (value !== null && value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

export async function syncFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/progress');
    if (!res.ok) return false;

    const serverData = await res.json() as Record<string, unknown>;
    const localData = getAllLocalData();

    if (hasServerData(serverData) && !hasLocalData(localData)) {
      applyServerData(serverData);
      return true;
    }

    if (hasServerData(serverData) && hasLocalData(localData)) {
      applyServerData(serverData);
      return true;
    }

    if (!hasServerData(serverData) && hasLocalData(localData)) {
      await pushToServer();
    }

    return false;
  } catch {
    return false;
  }
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export async function pushToServer(): Promise<void> {
  try {
    const data = getAllLocalData();
    if (!hasLocalData(data)) return;

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // silent fail — localStorage still has the data
  }
}

export function debouncedPush(): void {
  if (typeof window === 'undefined') return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    pushToServer();
  }, 1000);
}
