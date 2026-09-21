# PLAN-012 — Brand Icons & Full-Route SEO Optimization

> **Status:** Completed  
> **PRD Source:** §7.6 (Màu sắc & Typography, nhận diện sản phẩm), Non-functional SEO & Web Manifest requirements.  
> **Production Domain:** `https://grouptalk.t5edu.site`

---

## 1. Overview & Objectives

1. **AI-Generated Icon Suite**:
   - Khởi tạo app icon nghệ thuật bằng Gemini AI (`generate_image`) dựa trên bảng màu 4 thể loại (Cặp đôi, Nhóm bạn, Nhóm nữ, Nhóm nam) và ý niệm vòng quay + thẻ bài/hội thoại deeptalk.
   - Biên tập và xuất bản qua `sharp` thành đầy đủ các kích thước chuẩn:
     - `app/apple-icon.png` & `public/apple-icon.png` (180x180 px)
     - `app/favicon.ico` & `public/favicon.ico` (multi-resolution 16, 32, 48 px RGBA)
     - `public/icon-192.png` & `public/icon-512.png` (PWA Android & Splash)
     - `app/icon.png` & `public/icon.png` (32x32 px)
     - `app/manifest.ts` (Next.js Web App Manifest)

2. **SEO Metadata & Search Engine Discovery**:
   - Domain chuẩn: `https://grouptalk.t5edu.site`
   - Cấu hình `metadataBase`, Title template (`%s | GroupTalk`), Description, bộ từ khóa tiếng Việt chiến lược, OpenGraph, Twitter Cards, Canonical links.
   - Phân định rõ ràng chính sách Robots:
     - Cho phép bot index các trang công cộng (`/`, `/session`, `/session/new/*`, `/contribute`, `/questions`).
     - Đặt `noindex, nofollow` cho các trang phiên chơi riêng tư (`/session/[sessionId]/play`, `/session/[sessionId]/code`, `/session/[sessionId]/history`, `/session/manage`).
   - Tự động sinh `app/robots.ts`, `app/sitemap.ts`, và `app/opengraph-image.tsx` (1200x630 px dynamic preview card).

---

## 2. Technical Decisions & Gotchas

- **ICO RGBA Format**: Turbopack image decoder của Next.js yêu cầu các frame PNG trong file `.ico` phải ở định dạng 32-bit RGBA (`sharp.ensureAlpha()`).
- **Zero Emoji Rule**: Duy trì nghiêm ngặt nguyên tắc thiết kế không sử dụng ký tự emoji trong title, description, keywords, hoặc icon branding.
- **Dynamic OG Image**: Sử dụng `next/og` (`ImageResponse`) để render card chia sẻ 1200x630 trực quan với 4 gradient chips theo đúng CSS variables của PRD.

---

## 3. Checklist & Deliverables

- [x] Tạo app icon qua Gemini AI prompt
- [x] Tạo `scripts/process-ai-icon.ts` xử lý resize và đóng gói ICO RGBA
- [x] Tạo `app/apple-icon.png`, `app/favicon.ico`, `app/icon.png`, `public/icon-192.png`, `public/icon-512.png`
- [x] Tạo `app/manifest.ts` (PWA Web App Manifest)
- [x] Tạo `app/robots.ts` & `app/sitemap.ts`
- [x] Tạo `app/opengraph-image.tsx` (Dynamic OG card)
- [x] Cập nhật root metadata trong `app/layout.tsx` với domain `https://grouptalk.t5edu.site`
- [x] Cập nhật metadata cho toàn bộ 10 route (`/`, `/session`, `/session/new/categories`, `/session/new/players`, `/session/[sessionId]/play`, `/session/[sessionId]/code`, `/session/[sessionId]/history`, `/session/manage`, `/contribute`, `/questions`)
- [x] Xác minh `bun run build` thành công 100%
- [x] Xác minh toàn bộ unit test suite (`bun test`) đạt 47/47 test passed
