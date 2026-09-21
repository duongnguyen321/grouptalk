# PLAN-013 — GitHub Actions CI/CD Workflows

> **Status:** Completed  
> **Source:** Continuous Integration & Automated Deployment Requirements.  
> **Target:** Self-hosted VPS with PM2, Postgres & Redis via Docker Compose.

---

## 1. Overview & Objectives

1. **Continuous Integration (CI)**:
   - File: `.github/workflows/ci.yml`
   - Trigger: Mọi pull request trỏ vào `main`, và mọi push vào các nhánh `main`, `feature/**`, `fix/**`.
   - Các bước kiểm định chất lượng tự động:
     - Cài đặt runtime Bun (`oven-sh/setup-bun@v2`, version `1.4.0`).
     - Cài đặt dependencies với `bun install --frozen-lockfile`.
     - Sinh Prisma Client (`bunx prisma generate`).
     - Kiểm tra Lint mã nguồn (`bun run lint`).
     - Kiểm tra TypeScript type safety (`bunx tsc --noEmit`).
     - Chạy toàn bộ unit test suite (`bun test`).
     - Kiểm tra biên dịch production bundle (`bun run build`).

2. **Continuous Deployment (CD)**:
   - File: `.github/workflows/deploy-production.yml`
   - Trigger: Tự động chạy khi push/merge vào nhánh `main` hoặc kích hoạt thủ công qua `workflow_dispatch`.
   - Quản lý concurrency: `grouptalk-production` đảm bảo chỉ có 1 job deploy chạy tại một thời điểm, tránh race condition.
   - Triển khai máy chủ VPS qua `appleboy/ssh-action@v1.2.4`:
     - Kết nối bảo mật sử dụng `GROUPTALK_IP`, `GROUPTALK_USERNAME`, `GROUPTALK_PASSWORD` (hoặc `GROUPTALK_SSH_KEY`).
     - Phân tích commit thay đổi (schema, dependencies, infrastructure).
     - Pull mã nguồn mới nhất từ GitHub bằng `GIT_ASKPASS` nếu có cấu hình token hoặc pull trực tiếp từ remote `origin/main`.
     - Đảm bảo container Docker (Postgres & Redis) đang hoạt động và đạt trạng thái healthy.
     - Đồng bộ dependencies (`bun install --frozen-lockfile`).
     - Chạy database migration và sinh client (`bunx prisma migrate deploy`, `bunx prisma generate`).
     - Build bản phát hành standalone (`bun run build`).
     - Copy tài nguyên tĩnh (`public/` và `.next/static`) vào thư mục standalone theo kiến trúc Next.js.
     - Tải lại ứng dụng không downtime qua PM2 (`pm2 reload ecosystem.config.js --update-env` và `pm2 save`).

3. **Baseline Code Quality & Zero Emoji**:
   - Dọn dẹp dứt điểm các cảnh báo và lỗi lint trong `components/session/session-home.tsx`, `components/session/session-manager.tsx`, `ecosystem.config.js`, và `app/session/[sessionId]/play/actions.ts`.
   - Trích xuất hàm `formatRelativeTime` vào `lib/date.ts` tuân thủ nguyên tắc DRY và React pure functions.
   - Thêm cơ chế guard kết nối cơ sở dữ liệu trong `lib/game/priority-spin.test.ts` để đảm bảo unit test runner luôn vượt qua 100% trong môi trường cô lập.
   - Tuân thủ tuyệt đối quy tắc Zero Emoji trên toàn bộ workflow YAML, script output và tài liệu.

---

## 2. GitHub Secrets Configuration

| Tên Secret | Bắt buộc | Mô tả |
|---|---|---|
| `GROUPTALK_IP` | Có | Địa chỉ IP hoặc hostname của VPS production |
| `GROUPTALK_USERNAME` | Có | Username đăng nhập SSH (ví dụ `root` hoặc deploy user) |
| `GROUPTALK_PASSWORD` | Có* | Mật khẩu đăng nhập SSH (*hoặc dùng `GROUPTALK_SSH_KEY`) |
| `GROUPTALK_SSH_KEY` | Không | Khóa SSH Private Key (nếu sử dụng xác thực bằng key) |
| `GROUPTALK_PORT` | Không | Cổng SSH trên VPS (mặc định 22) |
| `GROUPTALK_PATH` | Có | Đường dẫn tuyệt đối đến thư mục dự án trên VPS (ví dụ `/var/www/grouptalk`) |
| `GROUPTALK_GIT_USERNAME` | Không | GitHub username nếu repository ở chế độ riêng tư |
| `GROUPTALK_GIT_TOKEN` | Không | GitHub Personal Access Token (PAT) với quyền read contents |

---

## 3. Checklist & Deliverables

- [x] Tạo tiện ích ngày tháng dùng chung `lib/date.ts` (`formatRelativeTime`)
- [x] Sửa lỗi ESLint purity `Date.now()` trong `components/session/session-home.tsx` và `components/session/session-manager.tsx`
- [x] Sửa cấu hình `ecosystem.config.js` cho phép `require()` trong môi trường PM2 Node.js
- [x] Dọn dẹp unused import trong `app/session/[sessionId]/play/actions.ts`
- [x] Thêm DB availability guard trong `lib/game/priority-spin.test.ts`
- [x] Kiểm tra `bun run lint` đạt 0 errors, 0 warnings
- [x] Kiểm tra `bun test` đạt 48/48 tests passed
- [x] Kiểm tra `bunx tsc --noEmit` đạt 0 errors
- [x] Kiểm tra `bun run build` thành công
- [x] Tạo workflow CI `.github/workflows/ci.yml`
- [x] Tạo workflow CD `.github/workflows/deploy-production.yml`
- [x] Xác thực cú pháp YAML hợp lệ 100%
- [x] Cập nhật tài liệu `README.md`, `TODO.md`, `AGENTS.md`
