# PLAN-008 — Priority Spin (Ưu tiên Quay trúng người chơi)

> Host có thể **bí mật thiết lập trọng số** để một hoặc nhiều người chơi có xác suất bị quay trúng cao hơn. Cấu hình lưu trong DB (`GameSession.priorityConfig`), tồn tại khi copy phiên, và được áp dụng hoàn toàn phía server — vòng quay trông hoàn toàn tự nhiên với người ngoài.

---

## Brief Task List (thứ tự thực thi)

1. **Schema migration** — thêm cột `priorityConfig Json?` vào `GameSession`
2. **Utility `pickWeightedRandom`** — hàm chọn ngẫu nhiên có trọng số trong `eligibility.ts`
3. **`setPriorityAction`** — Server Action lưu/xóa priority config vào DB
4. **Cập nhật `spinAction`** — đọc `priorityConfig` từ DB và dùng `pickWeightedRandom`
5. **`useLongPress` hook** — custom hook phát hiện long-press 700ms
6. **`PrioritySheet` component** — bottom drawer UI để host cấu hình priority
7. **Cập nhật `PlayScreen`** — gắn long-press lên sessionCode chip, mount `PrioritySheet`
8. **Cập nhật `copySessionFromCode`** — copy luôn `priorityConfig` khi sao chép phiên
9. **Thêm constants** — key, default weight vào `constants.ts`
10. **Kiểm thử thủ công** — chạy qua checklist toàn bộ flow

---

## File Reference Table

| Task | File | Loại thay đổi |
|------|------|---------------|
| 1 | `prisma/schema.prisma` | MODIFY |
| 2 | `lib/game/eligibility.ts` | MODIFY |
| 3 | `app/session/[sessionId]/play/actions.ts` | MODIFY (thêm action mới) |
| 4 | `app/session/[sessionId]/play/actions.ts` | MODIFY (sửa spinAction) |
| 5 | `lib/hooks/use-long-press.ts` | NEW |
| 6 | `components/play/priority-sheet.tsx` | NEW |
| 7 | `components/play/play-screen.tsx` | MODIFY |
| 8 | `lib/game/copy-session.ts` | MODIFY |
| 9 | `lib/constants.ts` | MODIFY |

---

## Business Logic

### Tại sao tính năng này tồn tại?

Host đôi khi muốn "ưu tiên" một người chơi cụ thể — để trò chơi vui hơn, để người mới được hỏi nhiều hơn, hoặc đơn giản là để "trêu" ai đó. Tuy nhiên tính công khai của vòng quay là một phần trải nghiệm cốt lõi của game — nếu ai biết game bị dàn xếp, niềm vui sẽ bị phá vỡ. Vì vậy:

- **Giao diện mở bảng phải hoàn toàn ẩn**: chỉ host biết cử chỉ nhấn giữ tồn tại.
- **Vòng quay phải trông tự nhiên**: server chọn người thắng bằng weighted random, wheel animation vẫn xoay bình thường đến đúng slot đó.
- **Cấu hình phải tồn tại qua các vòng chơi và khi copy session**: lưu vào DB, không phải memory.

### Cấu trúc `priorityConfig`

```ts
// Kiểu dữ liệu lưu trong GameSession.priorityConfig (JSON field)
type PriorityConfig = {
  // key: SessionPlayer.id (string cuid)
  // value: weight multiplier (1 = bình thường, 2 = 2x, 3 = 3x, 5 = 5x)
  weights: Record<string, number>;
};
```

Người chơi không có entry trong `weights`, hoặc có weight = 1, được coi là trọng số mặc định.

### Weighted Random — cách tính xác suất

Ví dụ: 4 người chơi, An=1x, Bình=2x, Cường=3x, Dũng=1x

```
Pool: [An, Bình, Bình, Cường, Cường, Cường, Dũng]
Tổng slots: 1+2+3+1 = 7
P(An)    = 1/7 ≈ 14%
P(Bình)  = 2/7 ≈ 29%
P(Cường) = 3/7 ≈ 43%
P(Dũng)  = 1/7 ≈ 14%
```

### Copy Session & Priority

Khi `copySessionFromCode` tạo phiên mới từ source, nó cần:
1. Map `source.players[i].id` → `newSession.players[i].id` (đã có `playerIdBySource` map)
2. Copy `priorityConfig.weights` bằng cách remapping key cũ sang key mới
3. Nếu source không có `priorityConfig`, bỏ qua (null = bình thường)

---

## Technical Logic — Chi tiết từng file

---

### Task 1 — `prisma/schema.prisma`

Thêm field `priorityConfig Json?` vào model `GameSession`:

```prisma
model GameSession {
  // ... các field hiện tại ...
  priorityConfig       Json?
}
```

Sau khi sửa schema chạy:
```bash
bunx prisma migrate dev --name add-priority-config
bunx prisma generate
```

---

### Task 2 — `lib/game/eligibility.ts`

Thêm hàm `pickWeightedRandom` bên cạnh `pickRandomItem`:

```ts
export function pickWeightedRandom<T extends { id: string }>(
  items: readonly T[],
  weights: Record<string, number>,
): T | null {
  if (items.length === 0) return null;
  const pool = items.flatMap((item) =>
    Array(Math.max(1, Math.round(weights[item.id] ?? 1))).fill(item),
  );
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}
```

Khi `weights` rỗng hoặc tất cả = 1 → kết quả tương đương `pickRandomItem` (no regression).

---

### Task 3 — `app/session/[sessionId]/play/actions.ts` (thêm `setPriorityAction`)

```ts
export async function setPriorityAction(
  sessionId: string,
  weights: Record<string, number>,
): Promise<{ ok: true } | ActionFail> {
  // 1. Validate player IDs thuộc về sessionId này
  const players = await prisma.sessionPlayer.findMany({
    where: { sessionId },
    select: { id: true },
  });
  const validIds = new Set(players.map((p) => p.id));
  const cleaned = Object.fromEntries(
    Object.entries(weights).filter(([id]) => validIds.has(id)),
  );
  // 2. Nếu tất cả = 1 → lưu null (reset)
  const hasBoost = Object.values(cleaned).some((w) => w > 1);
  await prisma.gameSession.update({
    where: { id: sessionId },
    data: { priorityConfig: hasBoost ? { weights: cleaned } : null },
  });
  return { ok: true };
}
```

---

### Task 4 — `app/session/[sessionId]/play/actions.ts` (sửa `spinAction`)

Bên trong `withSessionLock` callback, thay `pickRandomItem(players)` thành:

```ts
const [players, session] = await Promise.all([
  prisma.sessionPlayer.findMany({
    where: { sessionId },
    select: { id: true, displayName: true },
  }),
  prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { priorityConfig: true, lastActiveAt: true },
  }),
]);

const weights =
  (session?.priorityConfig as { weights: Record<string, number> } | null)
    ?.weights ?? {};

const player = pickWeightedRandom(players, weights);
```

---

### Task 5 — `lib/hooks/use-long-press.ts` [NEW]

```ts
"use client";

import { useRef } from "react";

export function useLongPress(
  callback: () => void,
  { delayMs = 700 }: { delayMs?: number } = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clear() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onPointerDown: () => {
      timerRef.current = setTimeout(callback, delayMs);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
  };
}
```

---

### Task 6 — `components/play/priority-sheet.tsx` [NEW]

Props:
```ts
type PrioritySheetProps = {
  open: boolean;
  players: PlayPlayer[];
  sessionId: string;
  weights: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onWeightsChange: (weights: Record<string, number>) => void;
};
```

Weight steps: `[1, 2, 3, 5]` — 3 chấm tương ứng 3 cấp độ boost.

| Trạng thái chấm | Giá trị weight |
|---|---|
| `○○○` | 1x |
| `●○○` | 2x |
| `●●○` | 3x |
| `●●●` | 5x |

Khi host chạm chấm thứ `i` (0-indexed):
- Nếu weight hiện tại > `WEIGHT_STEPS[i]` → set weight = `WEIGHT_STEPS[i]`
- Nếu weight hiện tại = `WEIGHT_STEPS[i]` → set weight = 1 (reset)
- Nếu weight hiện tại < `WEIGHT_STEPS[i+1]` → set weight = `WEIGHT_STEPS[i+1]`

Khi đóng sheet → gọi `setPriorityAction(sessionId, weights)` rồi `onOpenChange(false)`.

Animation: `AnimatePresence` + backdrop overlay + `motion.div` trượt từ dưới lên (`y: "100%"` → `y: 0`), giống menu drawer hiện tại.

---

### Task 7 — `components/play/play-screen.tsx`

Thêm prop `initialWeights`:
```ts
type PlayScreenProps = {
  sessionId: string;
  sessionCode: string;
  categories: Category[];
  players: PlayPlayer[];
  initialWeights: Record<string, number>; // MỚI
};
```

Thêm state và hook:
```ts
const [priorityOpen, setPriorityOpen] = useState(false);
const [weights, setWeights] = useState<Record<string, number>>(initialWeights);
const longPressProps = useLongPress(() => setPriorityOpen(true), {
  delayMs: PRIORITY_LONG_PRESS_MS,
});
```

Gắn long-press vào sessionCode button (giữ nguyên onClick):
```tsx
<button
  type="button"
  {...longPressProps}
  onClick={() => router.push(`/session/${sessionId}/code`)}
  className="..."
>
  {sessionCode}
</button>
```

Mount `PrioritySheet`:
```tsx
<PrioritySheet
  open={priorityOpen}
  players={players}
  sessionId={sessionId}
  weights={weights}
  onOpenChange={setPriorityOpen}
  onWeightsChange={setWeights}
/>
```

Cập nhật `play/page.tsx` — thêm `priorityConfig` vào query và truyền `initialWeights` xuống:
```ts
select: { ..., priorityConfig: true }
// ...
initialWeights={(session.priorityConfig as { weights: Record<string,number> } | null)?.weights ?? {}}
```

---

### Task 8 — `lib/game/copy-session.ts`

Thêm remap priority sau khi xây dựng `playerIdBySource`:

```ts
const sourcePriority = source.priorityConfig as
  | { weights: Record<string, number> }
  | null;

const remappedWeights: Record<string, number> = {};
if (sourcePriority?.weights) {
  for (const [oldId, weight] of Object.entries(sourcePriority.weights)) {
    const newId = playerIdBySource.get(oldId);
    if (newId) remappedWeights[newId] = weight;
  }
}

// Trong gameSession.create data:
priorityConfig:
  Object.keys(remappedWeights).length > 0
    ? { weights: remappedWeights }
    : undefined,
```

Cũng cần include `priorityConfig` trong query lúc đầu:
```ts
const source = await prisma.gameSession.findUnique({
  where: { sessionCode },
  include: {
    players: { select: { id: true, displayName: true } },
    answers: { select: { sessionPlayerId: true, questionId: true, answeredAt: true } },
  },
  // thêm:
  select: { priorityConfig: true }, // hoặc dùng include + thêm field
});
```

---

### Task 9 — `lib/constants.ts`

```ts
export const PRIORITY_WEIGHT_STEPS = [1, 2, 3, 5] as const;
export const PRIORITY_DOT_COUNT = 3;
export const PRIORITY_LONG_PRESS_MS = 700;
```

---

## Manual Test Checklist

### Flow 1: Mở bảng ưu tiên
- [x] Tap nhanh vào sessionCode chip → điều hướng sang `/code` view (KHÔNG mở sheet)
- [x] Nhấn giữ 700ms vào sessionCode chip → bảng ưu tiên trượt lên từ dưới
- [x] Bảng hiển thị đúng danh sách tên người chơi
- [x] Mỗi người chơi mặc định `○○○` (1x)

### Flow 2: Cấu hình trọng số
- [x] Chạm chấm 1 → `●○○` (2x)
- [x] Chạm chấm 2 → `●●○` (3x)
- [x] Chạm chấm 3 → `●●●` (5x)
- [x] Chạm chấm 1 khi đang 2x → reset về `○○○` (1x)
- [x] Touch target ≥ 44px mỗi chấm

### Flow 3: Lưu và áp dụng
- [x] Chạm backdrop để đóng → gọi `setPriorityAction` thành công
- [x] Mở lại sheet → hiển thị đúng trọng số vừa lưu
- [x] Quay 10-20 lần với 1 player 5x → người đó xuất hiện đa số (~70%)
- [x] Reset tất cả về 1x → xác suất đồng đều

### Flow 4: Visual stealth
- [x] Vòng quay KHÔNG có visual indicator nào báo "đang ở chế độ ưu tiên"
- [x] Wheel dừng đúng slot của người server chọn
- [x] Người khác nhìn vào thấy lượt quay tự nhiên bình thường

### Flow 5: Persistence & Copy
- [x] Reload trang → mở sheet → trọng số vẫn giữ (từ DB)
- [x] Đổi thiết bị, join lại session → config vẫn còn
- [x] Copy session → phiên mới có cùng trọng số tương đương
- [x] Trọng số trong phiên copy ánh xạ đúng player mới (không nhầm ID cũ)

### Flow 6: Edge cases
- [x] 2 người chơi + 1 người 5x → xác suất ~83% (5/6)
- [x] 1 người chơi duy nhất → luôn chọn người đó
- [x] `priorityConfig` null trong DB → uniform random bình thường
- [x] Weight = 1 cho tất cả → lưu null vào DB (không lưu config thừa)

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?
