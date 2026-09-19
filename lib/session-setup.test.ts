import { expect, test } from "bun:test";
import { Category } from "@/generated/prisma/enums";
import { parseSessionCategories, parseSessionPlayers } from "@/lib/session-setup";

test("rejects empty and unknown categories", () => {
  expect(parseSessionCategories([])).toBeNull();
  expect(parseSessionCategories(["PARTY"])).toBeNull();
});

test("keeps unique valid categories", () => {
  expect(parseSessionCategories([Category.FRIENDS, Category.FRIENDS])).toEqual([
    Category.FRIENDS,
  ]);
});

test("rejects fewer than two players or duplicates", () => {
  expect(parseSessionPlayers(["An"])).toBeNull();
  expect(parseSessionPlayers(["An", " an "])).toBeNull();
});

test("normalizes player names", () => {
  expect(parseSessionPlayers(["  An  ", "Bình"])).toEqual(["An", "Bình"]);
});
