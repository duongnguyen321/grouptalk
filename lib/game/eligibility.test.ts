import { expect, test } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import { CRUSH_TOPIC_NAME } from "@/lib/constants";
import {
  filterEligibleQuestions,
  pickTopicWeightedRandom,
  pickWeightedRandom,
  shouldSoftDeleteQuestion,
  takeTeaserQuestions,
} from "@/lib/game/eligibility";

const friendsQuestion = {
  id: "q-friends",
  isDeleted: false,
  topicName: "Bạn bè",
  categories: [Category.FRIENDS],
};

const crushQuestion = {
  id: "q-crush",
  isDeleted: false,
  topicName: CRUSH_TOPIC_NAME,
  categories: [Category.FRIENDS],
};

const deletedQuestion = {
  id: "q-deleted",
  isDeleted: true,
  topicName: "Bạn bè",
  categories: [Category.FRIENDS],
};

test("drops answered, hidden, deleted, and crush when disabled", () => {
  const result = filterEligibleQuestions(
    [friendsQuestion, crushQuestion, deletedQuestion, { ...friendsQuestion, id: "q-done" }],
    {
      sessionCategories: [Category.FRIENDS],
      crushQuestionEnabled: false,
      hiddenQuestionIds: new Set(["q-friends"]),
      answeredQuestionIds: new Set(["q-done"]),
      allowAnsweredRepeats: false,
    },
  );

  expect(result.map((question) => question.id)).toEqual([]);
});

test("falls back to answered questions but never hidden or deleted", () => {
  const result = filterEligibleQuestions(
    [friendsQuestion, crushQuestion, deletedQuestion],
    {
      sessionCategories: [Category.FRIENDS],
      crushQuestionEnabled: false,
      hiddenQuestionIds: new Set(["q-friends"]),
      answeredQuestionIds: new Set(),
      allowAnsweredRepeats: true,
    },
  );

  expect(result.map((question) => question.id)).toEqual([]);
});

test("includes crush topic only when the session flag is on", () => {
  const withoutCrush = filterEligibleQuestions([crushQuestion], {
    sessionCategories: [Category.FRIENDS],
    crushQuestionEnabled: false,
    hiddenQuestionIds: new Set(),
    answeredQuestionIds: new Set(),
    allowAnsweredRepeats: false,
  });
  const withCrush = filterEligibleQuestions([crushQuestion], {
    sessionCategories: [Category.FRIENDS],
    crushQuestionEnabled: true,
    hiddenQuestionIds: new Set(),
    answeredQuestionIds: new Set(),
    allowAnsweredRepeats: false,
  });

  expect(withoutCrush).toEqual([]);
  expect(withCrush.map((question) => question.id)).toEqual(["q-crush"]);
});

test("allows answered repeats when requested", () => {
  const result = filterEligibleQuestions([friendsQuestion], {
    sessionCategories: [Category.FRIENDS],
    crushQuestionEnabled: false,
    hiddenQuestionIds: new Set(),
    answeredQuestionIds: new Set(["q-friends"]),
    allowAnsweredRepeats: true,
  });

  expect(result.map((question) => question.id)).toEqual(["q-friends"]);
});

test("soft-delete triggers at 30 percent", () => {
  expect(shouldSoftDeleteQuestion(3, 10)).toBe(true);
  expect(shouldSoftDeleteQuestion(2, 10)).toBe(false);
  expect(shouldSoftDeleteQuestion(1, 0)).toBe(false);
});

test("teaser pick never exceeds three", () => {
  const pool = Array.from({ length: 8 }, (_, index) => ({ id: `q-${index}` }));
  expect(takeTeaserQuestions(pool)).toHaveLength(3);
  expect(takeTeaserQuestions(pool.slice(0, 2))).toHaveLength(2);
});

test("pickWeightedRandom returns null on empty items", () => {
  expect(pickWeightedRandom([], {})).toBeNull();
});

test("pickWeightedRandom returns sole item regardless of weight", () => {
  const player = { id: "p1", name: "An" };
  expect(pickWeightedRandom([player], {})).toEqual(player);
  expect(pickWeightedRandom([player], { p1: 5 })).toEqual(player);
});

test("pickWeightedRandom respects weights in distribution", () => {
  const p1 = { id: "p1", name: "An" };
  const p2 = { id: "p2", name: "Bình" };
  const counts = { p1: 0, p2: 0 };
  const weights = { p1: 5, p2: 1 };

  for (let i = 0; i < 1000; i++) {
    const picked = pickWeightedRandom([p1, p2], weights);
    if (picked?.id === "p1") counts.p1++;
    if (picked?.id === "p2") counts.p2++;
  }

  // With 5:1 ratio, p1 should be picked roughly 83% of the time (>70% confidence bound)
  expect(counts.p1).toBeGreaterThan(700);
  expect(counts.p2).toBeGreaterThan(50);
});

test("pickTopicWeightedRandom returns null on empty items", () => {
  expect(pickTopicWeightedRandom([])).toBeNull();
});

const makeQ = (id: string, topicName: string) => ({
  id,
  topicName,
  isDeleted: false,
  categories: [Category.FRIENDS],
});

const CRUSH_BIG_POOL = [
  ...Array.from({ length: 10 }, (_, i) => makeQ(`friends-${i}`, "Bạn bè")),
  ...Array.from({ length: 10 }, (_, i) => makeQ(`challenge-${i}`, "Thử thách")),
  makeQ("crush-0", "Thích thầm"),
  makeQ("crush-1", "Thích thầm"),
  makeQ("love-0", "Tình cảm"),
  makeQ("memory-0", "Kỷ niệm"),
];

test("crush mode off: same behavior as before, no guaranteed slot", () => {
  const result = takeTeaserQuestions(CRUSH_BIG_POOL, {
    crushQuestionEnabled: false,
  });
  expect(result.length).toBeLessThanOrEqual(3);
});

test("crush mode on: always includes Thích thầm or Tình cảm when pool has them", () => {
  const GUARANTEED = new Set(["Thích thầm", "Tình cảm"]);
  for (let i = 0; i < 200; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, {
      crushQuestionEnabled: true,
    });
    expect(result.some((q) => GUARANTEED.has(q.topicName))).toBe(true);
  }
});

test("crush mode on: falls back to Kỷ niệm when guaranteed topics exhausted", () => {
  const smallPool = [
    makeQ("memory-0", "Kỷ niệm"),
    makeQ("memory-1", "Kỷ niệm"),
    makeQ("friends-0", "Bạn bè"),
  ];
  for (let i = 0; i < 50; i++) {
    const result = takeTeaserQuestions(smallPool, {
      crushQuestionEnabled: true,
    });
    expect(result.some((q) => q.topicName === "Kỷ niệm")).toBe(true);
  }
});

test("crush mode on: emotional topics dominate weighted slots", () => {
  const EMOTIONAL = new Set(["Thích thầm", "Tình cảm", "Kỷ niệm"]);
  let emotionalCount = 0;
  let totalSlots = 0;
  for (let i = 0; i < 500; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, {
      crushQuestionEnabled: true,
    });
    for (const q of result) {
      if (EMOTIONAL.has(q.topicName)) emotionalCount++;
      totalSlots++;
    }
  }
  expect(emotionalCount / totalSlots).toBeGreaterThan(0.5);
});

test("crush mode on: no duplicate questions in same draw", () => {
  for (let i = 0; i < 100; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, {
      crushQuestionEnabled: true,
    });
    const ids = result.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  }
});

test("crush mode on: handles tiny pool without crash", () => {
  const tiny = [makeQ("a", "Thích thầm"), makeQ("b", "Bạn bè")];
  const result = takeTeaserQuestions(tiny, { crushQuestionEnabled: true });
  expect(result.length).toBeGreaterThan(0);
  expect(result.length).toBeLessThanOrEqual(2);
});

