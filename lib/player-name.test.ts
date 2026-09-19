import { expect, test } from "bun:test";
import { isSamePlayerName, normalizePlayerName } from "@/lib/player-name";

test("trims and collapses player name spaces", () => {
  expect(normalizePlayerName("  An   Bình  ")).toBe("An Bình");
});

test("treats Vietnamese names as equal ignoring case", () => {
  expect(isSamePlayerName("An", " an ")).toBe(false);
  expect(isSamePlayerName("An", "an")).toBe(true);
});
