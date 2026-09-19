# PLAN-011 — Question Stats & Explorer (Thống kê & Khám phá câu hỏi)

> Hiển thị tổng quan số lượng câu hỏi và số lượng người chơi (`SessionPlayer`) tại trang Splash (`/`) và Session Home (`/session`). Khi bấm vào, điều hướng tới trang chi tiết `/questions` hiển thị danh sách câu hỏi dạng list, bộ lọc Topic dạng chip cuộn ngang, và phân trang vô tận (infinite scroll) 20 câu/lần.

---

## Brief Task List (thứ tự thực thi)

1. **Thêm hằng số phân trang** — Thêm `QUESTIONS_PAGE_SIZE = 20` vào `lib/constants.ts`
2. **Tạo Server Actions truy vấn thống kê và câu hỏi** — `app/questions/actions.ts` cung cấp `getOverviewStats()`, `getTopicsWithCounts()`, và `fetchQuestionsBatch({ topicId, page, limit })`
3. **Tạo component widget tổng quan** — `components/ui/stats-overview-card.tsx` hiển thị số câu hỏi, số người chơi với Lucide icons và link sang `/questions`
4. **Cập nhật trang Splash (`/`)** — Cập nhật `app/page.tsx` và `components/splash/splash-screen.tsx` hiển thị widget tổng quan
5. **Cập nhật trang Session Home (`/session`)** — Cập nhật `app/session/page.tsx` và `components/session/session-home.tsx` hiển thị widget tổng quan
6. **Tạo component duyệt câu hỏi Client** — `components/questions/questions-explorer.tsx` chứa bộ lọc topic (chip list), danh sách câu hỏi kèm badges (Topic, QuestionType, Categories, Contributor), và IntersectionObserver infinite scroll
7. **Tạo trang `/questions`** — `app/questions/page.tsx` (Server Component) tải dữ liệu ban đầu và render `BackHeader` cùng `QuestionsExplorer`
8. **Viết unit test** — `lib/questions-pagination.test.ts` kiểm thử logic tính toán phân trang và cấu trúc dữ liệu
9. **Kiểm thử thủ công & Build check** — Chạy `bun test` và `bun run build` đảm bảo không có lỗi TypeScript / SSR

---

## File Reference Table

| Task | File | Loại thay đổi | Mô tả |
|------|------|---------------|-------|
| 1 | `lib/constants.ts` | MODIFY | Khai báo `QUESTIONS_PAGE_SIZE = 20` |
| 2 | `app/questions/actions.ts` | NEW | Server Actions lấy thống kê, danh sách topics và batch câu hỏi |
| 3 | `components/ui/stats-overview-card.tsx` | NEW | Card hiển thị tổng quan số câu hỏi & người chơi |
| 4 | `app/page.tsx` | MODIFY | Fetch stats từ server và truyền cho `SplashScreen` |
| 4 | `components/splash/splash-screen.tsx` | MODIFY | Render `StatsOverviewCard` tại trang Splash |
| 5 | `app/session/page.tsx` | MODIFY | Fetch stats từ server và truyền cho `SessionHome` |
| 5 | `components/session/session-home.tsx` | MODIFY | Render `StatsOverviewCard` tại trang Session Home |
| 6 | `components/questions/questions-explorer.tsx` | NEW | Client component lọc topic, render thẻ câu hỏi, infinite scroll |
| 7 | `app/questions/page.tsx` | NEW | Server component trang `/questions` kết hợp `BackHeader` |
| 8 | `lib/questions-pagination.test.ts` | NEW | Unit test kiểm tra logic phân trang và filter |

---

## Business Logic

### Tại sao tính năng này tồn tại?
1. **Minh bạch và tạo sự hào hứng cho người chơi (Social Proof)**: Người chơi mới khi vào ứng dụng (`/` hoặc `/session`) ngay lập tức thấy kho nội dung phong phú của GroupTalk (hàng nghìn câu hỏi) cùng sự tham gia sôi nổi của cộng đồng (số lượng lượt người chơi).
2. **Khám phá trước kho câu hỏi (Curiosity & Discovery)**: Thay vì chỉ có thể thấy từng câu hỏi ngẫu nhiên khi quay vòng quay, người dùng có thể chủ động xem qua danh sách các chủ đề (Bạn bè, Cặp đôi, Thích thầm, Kỷ niệm,...) để biết trò chơi có những câu hỏi hấp dẫn nào.
3. **Giữ nguyên tính bảo mật/riêng tư**: Số lượng người chơi hiển thị là tổng số lượt tham gia (`SessionPlayer`), không công khai danh sách tên người chơi riêng tư của các nhóm.

### Quy tắc hiển thị & tương tác
- **Trang Splash (`/`) và Session Home (`/session`)**: Hiển thị card tổng quan gồm 2 chỉ số: Số lượng câu hỏi (chỉ tính câu chưa bị xóa `isDeleted: false`) và số lượng người chơi (tổng số bản ghi `SessionPlayer`). Tapping vào card điều hướng sang `/questions`.
- **Trang `/questions`**:
  - Có thanh điều hướng `BackHeader` để quay lại trang trước (`/session` hoặc `/`).
  - Phía trên có dải bộ lọc Topic dạng chip cuộn ngang: mục đầu tiên là "Tất cả (tổng số)" theo sau là danh sách các Topic kèm số lượng câu hỏi tương ứng.
  - Bên dưới là danh sách câu hỏi: mỗi item hiển thị rõ nội dung câu hỏi, badge Topic, badge thể loại (Categories), loại câu hỏi (Có/Không, Thử thách, Mở) và tên người đóng góp (nếu có).
  - Phân trang dạng Infinite Scroll: ban đầu tải 20 câu đầu tiên, khi người dùng cuộn đến đáy trang, tự động gọi Server Action nạp tiếp 20 câu kế tiếp cho đến khi hết. Khi chuyển Topic, reset danh sách và nạp 20 câu của Topic mới.

---

## Technical Logic & Code Pattern Sketch

### 1. `lib/constants.ts`
```typescript
export const QUESTIONS_PAGE_SIZE = 20;
```

### 2. `app/questions/actions.ts`
```typescript
"use server";

import { prisma } from "@/lib/db";
import { QUESTIONS_PAGE_SIZE } from "@/lib/constants";

export async function getOverviewStats() {
  const [questionCount, playerCount] = await Promise.all([
    prisma.question.count({ where: { isDeleted: false } }),
    prisma.sessionPlayer.count(),
  ]);
  return { questionCount, playerCount };
}

export async function getTopicsWithCounts() {
  const topics = await prisma.topic.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          questions: { where: { isDeleted: false } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
  return topics.map((t) => ({
    id: t.id,
    name: t.name,
    count: t._count.questions,
  }));
}

export async function fetchQuestionsBatch({
  topicId,
  page = 0,
  limit = QUESTIONS_PAGE_SIZE,
}: {
  topicId?: string;
  page?: number;
  limit?: number;
}) {
  const where = {
    isDeleted: false,
    ...(topicId ? { topicId } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.question.findMany({
      where,
      select: {
        id: true,
        title: true,
        type: true,
        categories: true,
        createdAt: true,
        topic: { select: { id: true, name: true } },
        contributedBy: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: page * limit,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return {
    items: items.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      categories: q.categories,
      topic: q.topic,
      contributorName: q.contributedBy?.displayName ?? null,
      createdAt: q.createdAt.toISOString(),
    })),
    totalCount,
    hasMore: (page + 1) * limit < totalCount,
  };
}
```

### 3. `components/ui/stats-overview-card.tsx`
- Thiết kế card tinh tế, hiện đại chuẩn token `bg-white border border-ink/10 rounded-3xl p-4`.
- Sử dụng Lucide icons (`Sparkles`, `Users`, `ChevronRight`) — **tuyệt đối không dùng emoji**.
- Hỗ trợ `whileTap={{ scale: TAP_SCALE }}` từ `lib/motion.ts`.

### 4. `components/questions/questions-explorer.tsx`
- State: `selectedTopicId: string | null`, `items: QuestionItem[]`, `page: number`, `hasMore: boolean`, `loading: boolean`.
- Infinite Scroll trigger: `useRef` gán vào element cuối danh sách, kích hoạt qua `IntersectionObserver`.
- Badge render: Sử dụng `categoryIcon`, `categoryLabel` từ `lib/game/category-tone.ts` và nhãn câu hỏi từ `lib/game/question-notes.ts`.

---

## Verification Checklist

- [x] Business logic clearly written?
- [x] Technical todos listed sequentially?
- [x] Source code files referenced accurately?
- [x] Manual test checklist defined?

### Manual Test Checklist
1. Mở trang `/` khi chưa đăng nhập: Kiểm tra card tổng quan số câu hỏi và số người chơi hiển thị đúng số liệu.
2. Mở trang `/session`: Kiểm tra card tổng quan hiển thị đồng bộ.
3. Bấm vào card từ cả `/` và `/session`: Kiểm tra điều hướng mượt mà sang `/questions`.
4. Trên `/questions`:
   - Nút Back (`ChevronLeft`) đưa về trang trước đó.
   - Hiển thị danh sách 20 câu hỏi ban đầu kèm badge Topic, Categories, Loại câu hỏi, Người đóng góp.
   - Thử bấm đổi sang Topic khác (ví dụ: "Thích thầm"): Danh sách reset và nạp các câu hỏi thuộc topic đó.
   - Cuộn xuống đáy danh sách: Quan sát hiệu ứng loading và tự động nạp tiếp 20 câu hỏi tiếp theo (infinite scroll).
   - Khi cuộn đến hết toàn bộ câu hỏi: Hiển thị thông báo "Đã hiển thị tất cả câu hỏi".
5. Kiểm tra responsive trên mobile (touch target ≥ 44px, chip cuộn ngang mượt mà, không overflow).
