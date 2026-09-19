import { expect, test } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import { CRUSH_TOPIC_NAME } from "@/lib/constants";
import {
  filterEligibleQuestions,
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
