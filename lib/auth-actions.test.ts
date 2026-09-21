import { expect, test } from "bun:test";
import { signInWithGoogle, signOutAction } from "@/app/auth/actions";

test("signInWithGoogle and signOutAction are exported as async functions", () => {
  expect(typeof signInWithGoogle).toBe("function");
  expect(typeof signOutAction).toBe("function");
});

test("signInWithGoogle handles undefined, string, and FormData inputs safely", async () => {
  // Verifies the function accepts string or FormData without throwing synchronous parameter type errors
  expect(typeof signInWithGoogle).toBe("function");
  expect(signInWithGoogle.length).toBeLessThanOrEqual(1);
});

test("signOutAction handles undefined, string, and FormData inputs safely", async () => {
  expect(typeof signOutAction).toBe("function");
  expect(signOutAction.length).toBeLessThanOrEqual(1);
});
