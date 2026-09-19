import { expect, test } from "bun:test";
import { Category, QuestionType } from "@/generated/prisma/enums";
import { ANONYMOUS_DISPLAY_NAME } from "@/lib/constants";
import {
  isFriendsAutoTagged,
  parseContributeCategories,
  parseQuestionTitle,
  parseQuestionType,
  resolveContributorName,
  toggleContributeCategory,
} from "@/lib/game/contribute-form";

const empty = { categories: [], autoTagged: [] };

test("checking friends also checks boys and girls", () => {
  const state = toggleContributeCategory(empty, Category.FRIENDS, true);

  expect(state.categories).toEqual([
    Category.FRIENDS,
    Category.BOYS,
    Category.GIRLS,
  ]);
  expect(state.autoTagged).toEqual([Category.BOYS, Category.GIRLS]);
});

test("unchecking boys keeps friends selected and drops its auto label", () => {
  const state = toggleContributeCategory(
    {
      categories: [Category.FRIENDS, Category.BOYS, Category.GIRLS],
      autoTagged: [Category.BOYS, Category.GIRLS],
    },
    Category.BOYS,
    false,
  );

  expect(state.categories).toEqual([Category.FRIENDS, Category.GIRLS]);
  expect(isFriendsAutoTagged(state.autoTagged, Category.GIRLS)).toBe(true);
  expect(isFriendsAutoTagged(state.autoTagged, Category.BOYS)).toBe(false);
});

test("unchecking friends drops its auto-added categories", () => {
  const state = toggleContributeCategory(
    {
      categories: [Category.FRIENDS, Category.BOYS, Category.GIRLS],
      autoTagged: [Category.BOYS, Category.GIRLS],
    },
    Category.FRIENDS,
    false,
  );

  expect(state.categories).toEqual([]);
  expect(state.autoTagged).toEqual([]);
});

test("couple is never auto-tagged from friends", () => {
  const state = toggleContributeCategory(empty, Category.FRIENDS, true);
  expect(state.categories).not.toContain(Category.COUPLE);
  expect(state.autoTagged).not.toContain(Category.COUPLE);
});

test("rejects empty or unknown contribute categories", () => {
  expect(parseContributeCategories([])).toBeNull();
  expect(parseContributeCategories(["PARTY"])).toBeNull();
});

test("parses question title and type", () => {
  expect(parseQuestionTitle("  Hi  ")).toBeNull();
  expect(parseQuestionTitle("Kể một bí mật")).toBe("Kể một bí mật");
  expect(parseQuestionType("YESNO")).toBe(QuestionType.YESNO);
  expect(parseQuestionType("maybe")).toBeNull();
});

test("blank nickname becomes anonymous", () => {
  expect(resolveContributorName()).toBe(ANONYMOUS_DISPLAY_NAME);
  expect(resolveContributorName("   ")).toBe(ANONYMOUS_DISPLAY_NAME);
  expect(resolveContributorName("  Minh  ")).toBe("Minh");
});
