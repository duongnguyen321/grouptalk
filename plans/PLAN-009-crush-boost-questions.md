# PLAN-009 — Crush Boost Questions

> Khi `crushQuestionEnabled = true`, hệ thống rút 3 thẻ teaser theo **Phương án 3 (1 Guaranteed + 2 Weighted)**. Không có thay đổi schema, không có regression với `crushQuestionEnabled = false`.

---

## Brief Task List (thứ tự thực thi)

1. [x] **`lib/constants.ts`** — thêm 2 constant mới
2. [x] **`lib/game/eligibility.ts`** — refactor `takeTeaserQuestions` nhận options, thêm helper `pickTopicWeightedRandom`
3. [x] **`lib/game/select-question.ts`** — truyền `crushQuestionEnabled` vào `takeTeaserQuestions`
4. [x] **`lib/game/eligibility.test.ts`** — thêm test cases cho crush boost
5. [x] **Memory sync** — cập nhật `AGENTS.md`, `README.md`, `TODO.md`

---

## File Reference Table

| Task | File | Loại |
|------|------|-------|
| 1 | `lib/constants.ts` | MODIFY |
| 2 | `lib/game/eligibility.ts` | MODIFY |
| 3 | `lib/game/select-question.ts` | MODIFY |
| 4 | `lib/game/eligibility.test.ts` | MODIFY |
| 5 | `AGENTS.md`, `README.md`, `TODO.md` | MODIFY |

---

## Business Logic

### Vấn đề
Khi host bật **"Trong nhóm có ai đang 'thích thầm' không?"**, hệ thống hiện tại chỉ mở khóa topic `CRUSH_TOPIC_NAME = "Thích thầm"` vào pool chung rồi rút đều (uniform random). Với pool lớn, câu hỏi cảm xúc hiếm khi được bốc trúng — defeating the purpose.

### Giải pháp: 1 Guaranteed + 2 Weighted

Khi `crushQuestionEnabled = true`:
```
Eligible pool (filtered)
  │
  ├─ guaranteedPool = [q | q.topicName ∈ CRUSH_GUARANTEED_TOPICS]
  │    Fallback chain: ["Thích thầm", "Tình cảm"] → ["Kỷ niệm"] → pool chung
  │
  ├─ slot[0] = pickRandomItem(guaranteedPool)  // guaranteed
  │
  └─ remainingPool = pool \ {slot[0]}
       slot[1] = pickTopicWeightedRandom(remainingPool)  // weighted
       slot[2] = pickTopicWeightedRandom(remainingPool \ {slot[1]})  // weighted, no dup

shuffleInPlace([slot[0], slot[1], slot[2]])  // ẩn vị trí guaranteed
```

**Topic weight table:**
| Topic | Weight |
|-------|--------|
| Thích thầm | 3x |
| Tình cảm | 3x |
| Kỷ niệm | 2x |
| Mọi topic khác | 1x |

Khi `crushQuestionEnabled = false`: giữ nguyên `shuffleInPlace([...pool]).slice(0, 3)` — **zero regression**.

---

## Technical Logic — Chi tiết từng file

---

### Task 1 — `lib/constants.ts`

```ts
// Các topic được đảm bảo ít nhất 1 thẻ khi crushQuestionEnabled
export const CRUSH_GUARANTEED_TOPICS = ["Thích thầm", "Tình cảm"] as const;

// Trọng số của từng topic khi rút 2 thẻ weighted
// Các topic không có trong map → weight = 1 (default)
export const CRUSH_TOPIC_WEIGHT_MAP: Readonly<Record<string, number>> = {
  "Thích thầm": 3,
  "Tình cảm": 3,
  "Kỷ niệm": 2,
} as const;
```

---

### Task 2 — `lib/game/eligibility.ts`

#### 2a. Thêm helper `pickTopicWeightedRandom`

Weight dựa vào `topicName` (không phải `id`), lấy từ `CRUSH_TOPIC_WEIGHT_MAP`.

```ts
import { CRUSH_TOPIC_WEIGHT_MAP, ... } from "@/lib/constants";

/**
 * Chọn ngẫu nhiên 1 câu hỏi từ pool với xác suất tỷ lệ thuận topic weight.
 * Topics không có trong CRUSH_TOPIC_WEIGHT_MAP nhận weight = 1.
 */
export function pickTopicWeightedRandom<T extends { topicName: string }>(
  items: readonly T[],
): T | null {
  if (items.length === 0) return null;

  const pool = items.flatMap((item) => {
    const weight = CRUSH_TOPIC_WEIGHT_MAP[item.topicName] ?? 1;
    return Array<T>(weight).fill(item);
  });

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
```

#### 2b. Refactor `takeTeaserQuestions`

Hiện tại `takeTeaserQuestions<T>(items: T[])` không có type constraint. Cần thêm constraint `topicName` và `options`.

**Signature mới:**
```ts
type TakeTeaserOptions = {
  crushQuestionEnabled?: boolean;
};

export function takeTeaserQuestions<T extends { topicName: string }>(
  items: T[],
  { crushQuestionEnabled = false }: TakeTeaserOptions = {},
): T[]
```

**Implementation:**
```ts
export function takeTeaserQuestions<T extends { topicName: string }>(
  items: T[],
  { crushQuestionEnabled = false }: TakeTeaserOptions = {},
): T[] {
  // Fast path: crush mode off → hành vi cũ (zero regression)
  if (!crushQuestionEnabled || items.length === 0) {
    return shuffleInPlace([...items]).slice(0, TEASER_CARD_COUNT);
  }

  const result: T[] = [];
  const used = new Set<T>(); // Set by reference, đảm bảo không trùng dù cùng topicName

  // Slot 0 (Guaranteed): Thích thầm/Tình cảm → fallback Kỷ niệm → fallback pool chung
  const guaranteedPool = items.filter((q) =>
    (CRUSH_GUARANTEED_TOPICS as readonly string[]).includes(q.topicName),
  );
  const fallbackPool = items.filter((q) => q.topicName === "Kỷ niệm");
  const slot0 =
    pickRandomItem(guaranteedPool) ??
    pickRandomItem(fallbackPool) ??
    pickRandomItem(items);

  if (slot0) {
    result.push(slot0);
    used.add(slot0);
  }

  // Slot 1 & 2 (Weighted): rút không trùng
  for (let i = result.length; i < TEASER_CARD_COUNT; i++) {
    const remaining = items.filter((q) => !used.has(q));
    if (remaining.length === 0) break;
    const picked = pickTopicWeightedRandom(remaining);
    if (picked) {
      result.push(picked);
      used.add(picked);
    }
  }

  // Shuffle để ẩn vị trí thẻ guaranteed
  return shuffleInPlace(result);
}
```

**Lưu ý:**
- `used` là `Set<T>` theo reference object → đúng ngay cả khi 2 câu hỏi có cùng `topicName`.
- `pickRandomItem` tái sử dụng function hiện có — không viết thêm.
- `TEASER_CARD_COUNT` từ constants, không hardcode `3`.
- Nếu `items.length < TEASER_CARD_COUNT` → vòng lặp tự dừng, không crash.

---

### Task 3 — `lib/game/select-question.ts`

Dòng hiện tại:
```ts
return takeTeaserQuestions(pool).flatMap(...)
```

Sửa thành:
```ts
return takeTeaserQuestions(pool, {
  crushQuestionEnabled: session.crushQuestionEnabled,
}).flatMap(...)
```

Lưu ý: `pool` là `EligibleQuestion[]` — type đã có `topicName: string` → type-safe với constraint mới.

---

### Task 4 — `lib/game/eligibility.test.ts`

Thêm tests vào cuối file:

```ts
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
  const result = takeTeaserQuestions(CRUSH_BIG_POOL, { crushQuestionEnabled: false });
  expect(result.length).toBeLessThanOrEqual(3);
});

test("crush mode on: always includes Thích thầm or Tình cảm when pool has them", () => {
  const GUARANTEED = new Set(["Thích thầm", "Tình cảm"]);
  for (let i = 0; i < 200; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, { crushQuestionEnabled: true });
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
    const result = takeTeaserQuestions(smallPool, { crushQuestionEnabled: true });
    expect(result.some((q) => q.topicName === "Kỷ niệm")).toBe(true);
  }
});

test("crush mode on: emotional topics dominate weighted slots", () => {
  const EMOTIONAL = new Set(["Thích thầm", "Tình cảm", "Kỷ niệm"]);
  let emotionalCount = 0;
  let totalSlots = 0;
  for (let i = 0; i < 500; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, { crushQuestionEnabled: true });
    for (const q of result) {
      if (EMOTIONAL.has(q.topicName)) emotionalCount++;
      totalSlots++;
    }
  }
  expect(emotionalCount / totalSlots).toBeGreaterThan(0.5);
});

test("crush mode on: no duplicate questions in same draw", () => {
  for (let i = 0; i < 100; i++) {
    const result = takeTeaserQuestions(CRUSH_BIG_POOL, { crushQuestionEnabled: true });
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
```

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?

---

## Manual Test Checklist

### Flow 1: Crush mode OFF
- [ ] Tạo phiên Nhóm bạn, KHÔNG tích "Thích thầm"
- [ ] Quay 5 lần: 3 thẻ không bao giờ có topic "Thích thầm"
- [ ] Các chủ đề phân bố đều (Bạn bè, Thử thách, Gia đình)

### Flow 2: Crush mode ON
- [ ] Tạo phiên Nhóm bạn, CÓ tích "Thích thầm"
- [ ] Quay 5 lần: mỗi lần đều có ít nhất 1 thẻ "Thích thầm" hoặc "Tình cảm"
- [ ] "Kỷ niệm" xuất hiện thường xuyên hơn "Bạn bè" / "Thử thách"
- [ ] Thứ tự 3 thẻ ngẫu nhiên (guaranteed không cố định vị trí 1)
- [ ] Không có 2 thẻ cùng 1 câu hỏi trong cùng 1 lượt

### Flow 3: Edge Cases
- [ ] Đã trả lời hết Thích thầm + Tình cảm → fallback Kỷ niệm / pool chung, không crash
- [ ] Pool chỉ có 1 câu → trả 1 thẻ, không crash
- [ ] Pool chỉ có 2 câu → trả 2 thẻ, không crash
