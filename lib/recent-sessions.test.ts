import { expect, test, beforeEach } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import {
  clearRecentSessions,
  getRecentSessions,
  removeRecentSession,
  saveRecentSession,
} from "@/lib/recent-sessions";

class MockStorage implements Storage {
  private store: Record<string, string> = {};
  get length() {
    return Object.keys(this.store).length;
  }
  clear() {
    this.store = {};
  }
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
  removeItem(key: string) {
    delete this.store[key];
  }
  setItem(key: string, value: string) {
    this.store[key] = value;
  }
}

const mockStorage = new MockStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  localStorage.clear();
});

test("saves and retrieves recent sessions", () => {
  saveRecentSession({
    sessionId: "s1",
    sessionCode: "12345678",
    categories: [Category.COUPLE],
  });

  const sessions = getRecentSessions();
  expect(sessions.length).toBe(1);
  expect(sessions[0].sessionId).toBe("s1");
  expect(sessions[0].sessionCode).toBe("12345678");
  expect(sessions[0].categories).toEqual([Category.COUPLE]);
});

test("deduplicates recent sessions by sessionId and moves latest to front", () => {
  saveRecentSession({
    sessionId: "s1",
    sessionCode: "11111111",
    categories: [Category.FRIENDS],
  });
  saveRecentSession({
    sessionId: "s2",
    sessionCode: "22222222",
    categories: [Category.COUPLE],
  });
  saveRecentSession({
    sessionId: "s1",
    sessionCode: "11111111",
    categories: [Category.FRIENDS],
  });

  const sessions = getRecentSessions();
  expect(sessions.length).toBe(2);
  expect(sessions[0].sessionId).toBe("s1");
  expect(sessions[1].sessionId).toBe("s2");
});

test("caps recent sessions at maximum 5 entries", () => {
  for (let i = 1; i <= 7; i++) {
    saveRecentSession({
      sessionId: `s${i}`,
      sessionCode: `0000000${i}`,
      categories: [Category.FRIENDS],
    });
  }

  const sessions = getRecentSessions();
  expect(sessions.length).toBe(5);
  expect(sessions[0].sessionId).toBe("s7");
  expect(sessions[4].sessionId).toBe("s3");
});

test("removes a specific recent session", () => {
  saveRecentSession({
    sessionId: "s1",
    sessionCode: "11111111",
    categories: [Category.FRIENDS],
  });
  saveRecentSession({
    sessionId: "s2",
    sessionCode: "22222222",
    categories: [Category.COUPLE],
  });

  removeRecentSession("s1");
  const sessions = getRecentSessions();
  expect(sessions.length).toBe(1);
  expect(sessions[0].sessionId).toBe("s2");
});

test("clears all recent sessions", () => {
  saveRecentSession({
    sessionId: "s1",
    sessionCode: "11111111",
    categories: [Category.FRIENDS],
  });
  saveRecentSession({
    sessionId: "s2",
    sessionCode: "22222222",
    categories: [Category.COUPLE],
  });

  clearRecentSessions();
  expect(getRecentSessions()).toEqual([]);
});
