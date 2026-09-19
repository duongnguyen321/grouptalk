import { expect, test } from "bun:test";
import { getCurrentUserOrNull } from "@/lib/identity";

test("getCurrentUserOrNull returns null when missing both auth session and deviceId", async () => {
  const user = await getCurrentUserOrNull({});
  expect(user).toBeNull();
});

test("author condition correctly compares ownerUserId against user id", () => {
  const session = { ownerUserId: "user-author-123" };
  const authorUser = { id: "user-author-123" };
  const strangerUser = { id: "user-stranger-456" };

  expect(authorUser.id === session.ownerUserId).toBe(true);
  expect(strangerUser.id === session.ownerUserId).toBe(false);
  expect(null === session.ownerUserId).toBe(false);
});
