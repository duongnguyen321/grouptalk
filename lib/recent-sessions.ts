import type { Category } from "@/generated/prisma/enums";

const KEY = "grouptalk-recent-sessions";
const MAX = 5;

export type RecentSessionEntry = {
  sessionId: string;
  sessionCode: string;
  categories: Category[];
  createdAt: string;
};

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export function saveRecentSession(
  entry: Omit<RecentSessionEntry, "createdAt">,
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  const existing = getRecentSessions().filter((r) => r.sessionId !== entry.sessionId);
  const next = [
    { ...entry, createdAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX);
  try {
    storage.setItem(KEY, JSON.stringify(next));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("grouptalk-recent-sessions-updated"));
    }
  } catch {
    /* quota */
  }
}

export function getRecentSessions(): RecentSessionEntry[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    return JSON.parse(storage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

let cachedSnapshot: RecentSessionEntry[] = [];
let cachedRaw: string | null = null;

export function getRecentSessionsSnapshot(): RecentSessionEntry[] {
  const storage = getStorage();
  if (!storage) {
    return cachedSnapshot;
  }
  const raw = storage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSnapshot = raw ? JSON.parse(raw) : [];
    } catch {
      cachedSnapshot = [];
    }
  }
  return cachedSnapshot;
}

export function getRecentSessionsServerSnapshot(): RecentSessionEntry[] {
  return [];
}

export function subscribeRecentSessions(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", callback);
  window.addEventListener("grouptalk-recent-sessions-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("grouptalk-recent-sessions-updated", callback);
  };
}
