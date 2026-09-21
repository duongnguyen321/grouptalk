# PLAN-014: Tái Cấu Trúc Luồng Xác Thực (Auth) & Trang Chủ (Home Flow)

> **Mục tiêu**: Khắc phục dứt điểm lỗi không thể đăng xuất khi đã đăng nhập Google, không thể đăng nhập khi đang ở chế độ chơi ẩn danh, và loại bỏ hoàn toàn bẫy redirect tự động gây xung đột trên trang chủ (`/`).

---

## 1. Bối cảnh & Vấn đề

1. **Không thể đăng xuất**: NextAuth v5 `signOut` chưa từng được expose; không có UI đăng xuất nào trong toàn bộ ứng dụng.
2. **Không thể đăng nhập từ chế độ ẩn danh**: Tại màn hình `/session`, không có nút đăng nhập Google. Khi người dùng quay lại trang chủ `/`, logic `if (hasIdentity) router.replace("/session")` kích hoạt ngay lập tức, đá ngược lại `/session`.
3. **Flow trang Home (`/`) gây xung đột**: `AuthSessionProvider` gọi `getOrCreateDeviceId()` ngay khi mount layout, khiến `SplashScreen` luôn thấy `storedDeviceId` và tự động redirect vào `/session`. Trang chủ bị biến thành bẫy redirect, khiến người dùng không thể xem Landing page và thống kê của ứng dụng.

---

## 2. Giải pháp thực hiện

### 2.1 Bổ sung Server Action Xác thực (`app/auth/actions.ts`)
- `signOutAction(redirectToOrFormData?: string | FormData)`: Gọi NextAuth `signOut({ redirectTo })`, hỗ trợ cả gọi hàm trực tiếp lẫn form action.
- `signInWithGoogle(redirectToOrFormData?: string | FormData)`: Mở rộng nhận tham số redirect linh hoạt, tương thích Form Action.

### 2.2 Component `UserAccountBar` (`components/ui/user-account-bar.tsx`)
- Hiển thị thống nhất danh tính người dùng:
  - **Tài khoản Google**: Avatar/chữ cái đầu, tên hiển thị, badge "Tài khoản Google", và nút "Đăng xuất" (Lucide `LogOut`).
  - **Chế độ Ẩn danh**: Huy hiệu "Chế độ ẩn danh (lưu trên máy)", và nút "Đăng nhập" (Lucide `LogIn`) để nâng cấp tài khoản bất kỳ lúc nào.
- Tuân thủ nghiêm ngặt **ZERO EMOJI POLICY**, tích hợp `whileTap={{ scale: TAP_SCALE }}`.

### 2.3 Chuẩn hoá Trang chủ (`components/splash/splash-screen.tsx`)
- Gỡ bỏ hoàn toàn logic auto-redirect cưỡng bức (`useEffect` với `router.replace("/session")`).
- Render Landing Page ổn định với `StatsOverviewCard`:
  - Người dùng Google: Nút chính "Vào phòng chơi", nút phụ "Tạo phiên mới ngay".
  - Khách ẩn danh: Nút chính "Chơi ngay (Ẩn danh)", nút phụ "Đăng nhập với Google".

### 2.4 Tích hợp vào Sảnh chơi (`/session`) và Quản lý phiên (`/session/manage`)
- Tích hợp `UserAccountBar` ngay dưới header của `SessionHome` và `SessionManager`.
- Truyền `user` từ `auth()` server-side để tránh layout shift và hydration mismatch.
- Header sảnh có link "GroupTalk · Bắt đầu" trỏ về `/`.

---

## 3. Danh sách tệp đã cập nhật

- [MODIFY] `app/auth/actions.ts`: Thêm `signOutAction`, cập nhật `signInWithGoogle`.
- [NEW] `components/ui/user-account-bar.tsx`: Component hiển thị định danh & nút auth.
- [MODIFY] `components/splash/splash-screen.tsx`: Gỡ bỏ redirect trap, cải tiến giao diện Landing page.
- [MODIFY] `app/page.tsx`: Truyền `user` từ `auth()` xuống `SplashScreen`.
- [MODIFY] `components/session/session-home.tsx`: Tích hợp `UserAccountBar` và link về trang chủ.
- [MODIFY] `app/session/page.tsx`: Truyền `user` từ `auth()` xuống `SessionHome`.
- [MODIFY] `components/session/session-manager.tsx`: Tích hợp `UserAccountBar`.
- [MODIFY] `app/session/manage/page.tsx`: Truyền `user` từ `auth()` xuống `SessionManager`.
- [NEW] `lib/auth-actions.test.ts`: Unit test cho server actions.

---

## 4. Kiểm thử & Đánh giá

- `bun test`: 51/51 unit tests passed.
- `bun run lint`: 0 errors, 0 warnings.
- `bun x tsc --noEmit`: 0 TypeScript errors.
- `bun run build`: Build production hoàn tất thành công.
