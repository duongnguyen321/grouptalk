import { expect, test } from "bun:test";
import { nextWheelRotation, winnerTargetDegrees } from "@/lib/game/wheel-math";

test("lands the winner slice under the top pointer", () => {
  expect(winnerTargetDegrees(0, 4)).toBe(315);
  expect(winnerTargetDegrees(1, 4)).toBe(225);
});

test("adds extra full turns without changing the landing modulo", () => {
  const next = nextWheelRotation(40, 0, 4, 5);
  expect(next % 360).toBe(winnerTargetDegrees(0, 4));
  expect(next).toBeGreaterThan(40);
});
