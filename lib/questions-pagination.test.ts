import { describe, expect, it } from "bun:test";
import { QUESTIONS_PAGE_SIZE } from "./constants";

describe("Questions Pagination & Calculation Logic", () => {
  it("uses QUESTIONS_PAGE_SIZE as 20", () => {
    expect(QUESTIONS_PAGE_SIZE).toBe(20);
  });

  it("calculates pagination bounds correctly", () => {
    function computePagination(page: number, limit: number, totalCount: number) {
      const safeLimit = Math.max(1, Math.min(limit, 50));
      const safePage = Math.max(0, page);
      const skip = safePage * safeLimit;
      const hasMore = (safePage + 1) * safeLimit < totalCount;
      return { skip, take: safeLimit, hasMore };
    }

    // First page out of 45 items
    const page0 = computePagination(0, 20, 45);
    expect(page0.skip).toBe(0);
    expect(page0.take).toBe(20);
    expect(page0.hasMore).toBe(true);

    // Second page out of 45 items
    const page1 = computePagination(1, 20, 45);
    expect(page1.skip).toBe(20);
    expect(page1.take).toBe(20);
    expect(page1.hasMore).toBe(true);

    // Third (last) page out of 45 items
    const page2 = computePagination(2, 20, 45);
    expect(page2.skip).toBe(40);
    expect(page2.take).toBe(20);
    expect(page2.hasMore).toBe(false);

    // Clamps negative page or extreme limit
    const negativePage = computePagination(-5, 100, 10);
    expect(negativePage.skip).toBe(0);
    expect(negativePage.take).toBe(50); // clamped to 50
  });

  it("builds query filter conditionally based on topicId", () => {
    function buildWhereClause(topicId?: string | null) {
      return {
        isDeleted: false,
        ...(topicId ? { topicId } : {}),
      };
    }

    const withoutTopic = buildWhereClause(null);
    expect(withoutTopic).toEqual({ isDeleted: false });

    const withTopic = buildWhereClause("topic-123");
    expect(withTopic).toEqual({ isDeleted: false, topicId: "topic-123" });
  });
});
