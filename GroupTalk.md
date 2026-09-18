# PRD: GroupTalk

## 1\. Tổng quan sản phẩm

Một web game dạng "vòng quay \+ rút thẻ bài" dành cho nhóm người chơi tụ tập cùng một chỗ, dùng chung một thiết bị (điện thoại/tablet truyền tay nhau). Người chơi nhập tên, chọn thể loại nhóm (Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn), quay để chọn người trả lời, sau đó rút 1 trong 3 thẻ câu hỏi hiện ra để trả lời trước nhóm.

Điểm khác biệt:

* Cơ chế copy phiên sang máy khác bằng mã phiên 8 số — giải quyết vấn đề thực tế khi máy hết pin giữa buổi chơi (xem mục 6.5 — đây là copy, không phải "chuyển" độc quyền).  
* Kho câu hỏi cộng đồng với cơ chế tự làm sạch (auto-remove khi bị vote ẩn nhiều) và ghi nhận người đóng góp ngay trên mặt thẻ trước khi lật — tạo yếu tố nhân văn, gắn kết cộng đồng.

### 1.1 Mục tiêu

* Tạo trải nghiệm giải trí nhóm (icebreaker/team bonding/couple game) mượt, không cần setup phức tạp.  
* Cho phép chơi ẩn danh (deviceId) nhưng vẫn giữ được lịch sử qua tài khoản Google nếu muốn.  
* Xây dựng kho câu hỏi tự làm sạch qua cộng đồng, giảm chi phí kiểm duyệt thủ công.  
* Tôn vinh người đóng góp câu hỏi — tăng động lực tham gia cộng đồng.  
* Chuẩn bị nền tảng monetize qua ads (chi tiết gói Free/giới hạn sẽ quyết định ở giai đoạn sau, không nằm trong phạm vi bản v1 này).

### 1.2 Ngoài phạm vi (Out of scope — bản v1)

* Đa ngôn ngữ (chỉ tiếng Việt).  
* Chơi nhiều thiết bị đồng thời, đồng bộ real-time trong cùng 1 phiên logic (mỗi phiên là bản ghi độc lập tại 1 thiết bị; "copy sang máy khác" tạo ra một phiên MỚI độc lập — xem mục 6.5).  
* Kiểm duyệt nội dung bằng con người/admin panel — kiểm soát hoàn toàn dựa trên vote ngưỡng.  
* Giới hạn gói Free / paywall cụ thể — chưa cần thiết kế ở bản v1.

---

## 2\. Tech stack

| Layer | Công nghệ | Vai trò |
| :---- | :---- | :---- |
| Frontend/Fullstack framework | Next.js | UI \+ API routes/Server Actions |
| Cache/Lock | Redis | Lock theo session (tránh race condition khi thao tác đồng thời: quay, vote, đóng góp) |
| Database | PostgreSQL \+ Prisma ORM | Lưu trữ chính: users, sessions, players, questions, votes, answers |

Vai trò của Redis: Vì hành động "quay" và "vote ẩn" cần đảm bảo tính nhất quán ngay lập tức trong 1 phiên (VD: không cho quay 2 lần cùng lúc, không cho 2 request cùng ghi nhận việc trả lời một câu), Redis đóng vai trò distributed lock theo sessionId. Postgres là nguồn sự thật (source of truth) lâu dài.

---

## 3\. Định nghĩa vai trò & Authentication

* Không có vai trò "host"/quyền hạn đặc biệt. Đây là trò chơi 1 máy — ai đang cầm máy thì điều khiển toàn bộ.  
* Đăng nhập tùy chọn:  
  * Chơi ngay (Guest/DeviceId): không cần tài khoản, định danh bằng deviceId lưu local (localStorage/cookie). Dữ liệu (câu đã vote ẩn, lịch sử) gắn theo deviceId này — mất thiết bị/xóa data \= mất lịch sử.  
  * Google OAuth: đăng nhập để đồng bộ lịch sử chơi và câu hỏi đã vote ẩn qua nhiều thiết bị/lần chơi.  
* Tài khoản KHÔNG dùng để: phân quyền, giới hạn nội dung theo người chơi cụ thể trong phiên (vì username trong phiên là nhập tay, không map cứng với account).  
* Tên hiển thị của người đóng góp (mới, xem mục 6.6): với Google login → dùng tên Google. Với Guest → hỏi 1 lần "biệt danh hiển thị" (nickname) khi đóng góp câu hỏi lần đầu, lưu lại theo deviceId để dùng cho các lần đóng góp sau; nếu bỏ qua → hiển thị mặc định "Ẩn danh".

---

## 4\. Data Model (đề xuất, mức logic — sẽ refine khi viết Prisma schema)

### 4.1 Entities chính

User

* id  
* authType: device | google  
* deviceId (nullable nếu login Google)  
* googleId (nullable nếu guest)  
* displayName (tên hiển thị dùng khi đóng góp câu hỏi — lấy từ Google profile hoặc nickname tự đặt nếu guest; nullable nếu guest chưa từng đóng góp/chưa đặt nickname)  
* createdAt

GameSession (phiên chơi)

* id  
* sessionCode (mã 8 số, dùng để copy phiên sang máy khác — unique, chỉ gồm số để dễ nhập tay/đọc miệng)  
* ownerUserId (user đã tạo phiên gốc — chỉ mang tính tham chiếu, KHÔNG có quyền đặc biệt)  
* copiedFromSessionId (nullable — nếu phiên này được tạo ra từ hành động "copy" một phiên khác, lưu lại để truy vết nguồn nếu cần; không ảnh hưởng logic chơi)  
* categories: mảng thể loại đang active (Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn)  
* crushQuestionEnabled (bool — có tick checkbox "thích thầm" khi setup không, chỉ có ý nghĩa khi categories chứa Nhóm bạn)  
* createdAt, lastActiveAt  
* Không có expiredAt (không giới hạn thời gian sống)

SessionPlayer (người chơi trong phiên — chỉ là tên, không map account)

* id  
* sessionId  
* displayName (tên nhập tay)

Question (Card)

* id  
* title (nội dung câu hỏi)  
* type: yesno | challenge | open\_ended | ... (mở rộng được)  
* topicId (FK tới Topic — chủ đề, để dành cho tính năng chọn chủ đề sau này)  
* categories: mảng nhiều-nhiều với thể loại (Cặp đôi/Nhóm nữ/Nhóm nam/Nhóm bạn) — 1 câu có thể gắn nhiều thể loại  
* contributedByUserId (nullable — null nếu là câu seed hệ thống; nếu có, dùng để resolve displayName của User hiển thị lên mặt thẻ trước khi lật)  
* isDeleted (bool — bị xóa vĩnh viễn do vượt ngưỡng vote; record vẫn được giữ lại, không xóa cứng khỏi DB — xem mục 6.4)  
* createdAt

Topic (chủ đề — list hardcode trong DB, chuẩn bị cho filter theo chủ đề sau này)

* id, name

SessionAnswer (lịch sử: ai đã trả lời câu nào trong phiên nào)

* id  
* sessionId  
* sessionPlayerId (tên người trả lời trong phiên đó)  
* questionId  
* answeredAt  
* Unique constraint: \[sessionId, sessionPlayerId, questionId\]  
* Đã xác nhận: khi Question.isDeleted \= true, bản ghi SessionAnswer liên quan vẫn được giữ nguyên trong lịch sử (không xóa, không set null) — vì đây là dữ liệu lịch sử đã phát sinh, không phụ thuộc vào việc câu hỏi đó còn khả dụng để chơi tiếp hay không. Khi hiển thị lại lịch sử 1 phiên, nếu question bị isDeleted, UI có thể hiển thị nội dung câu hỏi kèm nhãn nhỏ "câu hỏi này đã được gỡ khỏi hệ thống" (tuỳ chọn, không bắt buộc ở v1).

QuestionVote (vote ẩn câu hỏi — theo user)

* id  
* userId  
* questionId  
* createdAt  
* Unique constraint: \[userId, questionId\]  
* Logic: khi user đã vote → câu đó ẩn vĩnh viễn với user đó (query loại trừ qua join). Khi count(QuestionVote where questionId \= X) / count(toàn bộ User trong hệ thống) ≥ 30% → set Question.isDeleted \= true (ẩn với TẤT CẢ, kể cả người chưa vote).

---

## 5\. User Flow chi tiết (screen-by-screen)

Mục này mô tả từng màn hình theo đúng thứ tự trải nghiệm, kèm trạng thái (state) và hành vi chuyển màn hình (transition). Phần layout/wireframe-bằng-lời chi tiết nằm ở mục 7\.

### 5.0 Sơ đồ luồng tổng quan

\[Splash/Login\]&nbsp;

&nbsp;&nbsp;&nbsp;→ \[Session Home: Tạo mới / Copy phiên\]

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ (Tạo mới) \[Chọn thể loại\] → \[Nhập danh sách người chơi\] → \[Màn hình chơi chính\]

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ (Copy phiên) \[Nhập mã 8 số\] → \[Màn hình chơi chính\] (state đã copy từ phiên nguồn)

&nbsp;

\[Màn hình chơi chính\] loop:

&nbsp;&nbsp;&nbsp;\[Idle \- chờ quay\] → \[Đang quay (spin animation)\] → \[3 thẻ úp hiện ra\]&nbsp;

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ \[Chọn 1 thẻ\] → \[Thẻ lật \- hiển thị câu hỏi\] → \[Idle \- chờ quay tiếp\]

&nbsp;&nbsp;&nbsp;(nhánh phụ, truy cập từ menu bất kỳ lúc nào): \[Đóng góp câu hỏi\] , \[Xem lịch sử phiên\]

&nbsp;

### 5.1 Màn hình 1 — Splash / Đăng nhập

* Mục đích: cho phép vào app nhanh nhất có thể (giảm friction), đồng thời cung cấp lựa chọn đăng nhập cho ai muốn giữ lịch sử.  
* Thành phần chính:  
  * Logo/tên app \+ 1 dòng tagline ngắn.  
  * 2 nút hành động chính: "Đăng nhập với Google" (nút phụ, ít nổi bật hơn) và "Chơi ngay" (nút chính, to, nổi bật — vì đây là hành vi được kỳ vọng nhiều nhất).  
* Hành vi:  
  * Bấm "Chơi ngay" → hệ thống tự sinh deviceId (nếu chưa có trong localStorage) → chuyển sang Màn hình 2\.  
  * Bấm "Đăng nhập Google" → OAuth flow chuẩn → sau khi thành công → chuyển sang Màn hình 2\.  
  * Nếu đã có session đăng nhập/deviceId từ trước (mở lại app) → bỏ qua màn hình này, vào thẳng Màn hình 2\.

### 5.2 Màn hình 2 — Session Home

* Mục đích: điểm quyết định giữa việc bắt đầu 1 buổi chơi mới hoặc tiếp tục 1 buổi chơi đang diễn ra ở máy khác.  
* Thành phần chính:  
  * Nút lớn "Tạo phiên mới".  
  * Nút lớn "Nhập mã để tiếp tục phiên" (copy phiên).  
  * *(Tuỳ chọn, nếu còn lịch sử local)*: danh sách rút gọn "Phiên gần đây trên máy này" để vào lại nhanh mà không cần nhập mã.  
* Hành vi:  
  * "Tạo phiên mới" → Màn hình 3 (Chọn thể loại).  
  * "Nhập mã để tiếp tục phiên" → mở input nhập 8 số → submit → Màn hình 5 (Chơi chính), với state được copy từ phiên nguồn (xem 6.5).  
    * Nếu mã sai/không tồn tại → hiện lỗi inline ngay dưới input, không rời màn hình.

### 5.3 Màn hình 3 — Chọn thể loại chơi

* Mục đích: xác định categories active cho phiên mới.  
* Thành phần chính:  
  * 4 thẻ lựa chọn lớn dạng grid 2x2 (mobile) hoặc hàng ngang (nếu màn rộng): Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn — mỗi thẻ có màu riêng theo bảng màu ở mục 7.3, có thể chọn nhiều thẻ (multi-select, có state "đã chọn" rõ ràng — viền sáng \+ dấu check).  
  * Khi Nhóm bạn được chọn → hiện thêm ngay dưới: checkbox nổi bật *"Trong nhóm có ai đang 'thích thầm' không?"* (label to, không phải chữ nhỏ ẩn) — xem style ở mục 7.5.  
  * Nút "Tiếp tục" ở cuối, disabled nếu chưa chọn thể loại nào.  
* Hành vi: chọn ≥1 thể loại → (nếu có Nhóm bạn, tick/không tick checkbox thích thầm) → "Tiếp tục" → Màn hình 4\.

### 5.4 Màn hình 4 — Nhập danh sách người chơi

* Mục đích: tạo các SessionPlayer.  
* Thành phần chính:  
  * Input dạng "chip/tag" — nhập tên, Enter để add thành 1 chip tên, có thể xoá từng chip.  
  * Đếm số người chơi hiện tại (VD: "3 người chơi") — validate tối thiểu 2 người mới cho tiếp tục.  
  * Nút "Bắt đầu chơi".  
* Hành vi: đủ ≥2 tên → "Bắt đầu chơi" → tạo GameSession \+ toàn bộ SessionPlayer → Màn hình 5\.

### 5.5 Màn hình 5 — Chơi chính (vòng lặp trung tâm của app)

Đây là màn hình người dùng ở lại lâu nhất, có nhiều state con:

State A — Idle (chờ quay)

* Hiển thị: khu vực trung tâm là 1 vòng quay (wheel) tĩnh, chia phần theo tên các SessionPlayer hiện tại; phía trên có badge nhỏ hiển thị thể loại đang chơi (VD: "🎉 Nhóm bạn"); nút "QUAY" to, chính giữa/dưới bánh xe.  
* Menu góc trên (icon 3 gạch hoặc "...") mở ra: Xem lịch sử phiên đã trả lời / Đóng góp câu hỏi / Xem mã phiên (để copy sang máy khác) / Thoát phiên.

State B — Đang quay (spin animation)

* Bánh xe quay nhanh dần rồi chậm dần lại, dừng tại 1 tên. Trong lúc quay, nút "QUAY" bị disable để tránh spam click.  
* Kết thúc quay: tên người trúng được phóng to ở giữa màn hình kèm hiệu ứng (confetti/glow) trong khoảng 1-1.5s.

State C — 3 thẻ úp (contributor teaser)

* Sau hiệu ứng tên trúng, chuyển cảnh: 3 thẻ bài (mặt úp — chưa lộ nội dung câu hỏi) bay ra dạng fan-out hoặc xếp ngang.  
* Mỗi thẻ úp hiển thị tên người đã đóng góp câu hỏi đó (VD: dòng nhỏ ở giữa thẻ: *"Đóng góp bởi: Minh Anh"* hoặc *"Đóng góp bởi: Ẩn danh"* nếu là câu seed hệ thống/không có tên) — đây là điểm tạo tính bất ngờ \+ nhân văn, người chơi chọn thẻ một phần dựa trên "ai đã đặt câu hỏi này".  
* Người dùng chạm vào 1 trong 3 thẻ để chọn.

State D — Thẻ lật (Reveal)

* Thẻ được chọn lật 180° (animation flip), mặt sau biến thành mặt trước với đầy đủ nội dung (layout chi tiết ở mục 7.2): tên người trả lời, câu hỏi, note hướng dẫn, nút vote ẩn.  
* 2 thẻ còn lại biến mất/mờ dần (không cần giữ lại).  
* Ghi nhận ngay lúc lật (không cần chờ hành động khác): tạo SessionAnswer\[sessionId, sessionPlayerId, questionId\].  
* Nút "Quay tiếp" xuất hiện ở dưới cùng.

State E — Vote ẩn (nhánh phụ trong State D)

* Bấm nút vote ẩn (góc thẻ) → hiện modal confirm nhỏ: *"Ẩn câu hỏi này khỏi các lượt chơi sau của bạn?"* → Đồng ý → ghi nhận QuestionVote, thẻ hiện tại vẫn giữ nguyên hiển thị (không cần đổi thẻ khác ngay, vì câu đã đọc rồi) → toast nhỏ xác nhận "Đã ẩn câu hỏi này".

Hành vi transition: D → (bấm "Quay tiếp") → quay lại State A.

### 5.6 Màn hình phụ — Đóng góp câu hỏi

* Mục đích: submit Question mới vào pool chung.  
* Thành phần chính (form):  
  * Input text: Tiêu đề câu hỏi (textarea, đa dòng nếu cần).  
  * Multi-select: Thể loại áp dụng (Cặp đôi / Nhóm nữ / Nhóm nam / Nhóm bạn) — khi tick Nhóm bạn, 2 ô Nhóm nam \+ Nhóm nữ tự động được tick kèm và hiển thị rõ trạng thái "đã tự động chọn" (VD: có nhãn nhỏ "tự động" cạnh 2 ô đó, người dùng vẫn có thể bỏ tick lại nếu không muốn).  
  * Dropdown/select: Chủ đề (Topic — list hardcode, chọn 1).  
  * Radio/select: Loại câu hỏi (Yes/No, Thử thách, Câu hỏi mở, ...).  
  * *(Nếu là Guest và chưa từng đặt nickname)*: field "Tên hiển thị của bạn" (optional — để trống thì lưu là "Ẩn danh"), chỉ hỏi 1 lần rồi lưu theo deviceId.  
  * Nút "Gửi đóng góp".  
* Hành vi: Submit → lưu trực tiếp vào pool (không cần duyệt) → toast xác nhận "Cảm ơn bạn đã đóng góp\!" → quay lại màn hình trước đó.

### 5.7 Màn hình phụ — Copy phiên (chi tiết)

* Từ Session Home (5.2) hoặc từ menu trong màn chơi chính (5.5) → chọn "Xem mã phiên" (ở máy nguồn) hoặc "Nhập mã để tiếp tục phiên" (ở máy đích).  
* Máy nguồn: hiển thị to, rõ, dễ đọc-miệng cho người khác: mã 8 số, có nút "Copy" (clipboard) tiện chia sẻ qua tin nhắn nếu cần.  
* Máy đích: input 8 ô số (kiểu OTP input) → tự submit khi đủ 8 số → gọi API copy → nếu hợp lệ, tạo GameSession mới với toàn bộ dữ liệu sao chép từ phiên nguồn (xem 6.5) → vào Màn hình 5 với state đầy đủ.

---

## 6\. Business Logic chi tiết

### 6.1 Chọn câu hỏi không lặp trong phiên

* Nguồn câu hỏi hợp lệ cho 1 người trả lời P trong phiên S \= tất cả Question thuộc thể loại đang active của S, trừ những câu đã có bản ghi SessionAnswer\[S, P, question\], trừ những câu bị user hiện tại (tài khoản đang cầm máy) vote ẩn.  
* Khi pool này rỗng (P đã trả lời hết mọi câu khả dụng trong phiên) → cho phép lặp lại các câu đã trả lời (bỏ qua điều kiện loại trừ theo SessionAnswer, chỉ giữ loại trừ theo vote ẩn).

### 6.2 Auto-active thể loại liên quan

* Rule này chỉ áp dụng ở form đóng góp câu hỏi (mục 5.6), KHÔNG áp dụng lúc setup phiên chơi (mục 5.3).  
* Khi người đóng góp tick chọn Nhóm bạn trong form đóng góp → hệ thống tự động tick kèm Nhóm nam và Nhóm nữ cho câu hỏi đó (người dùng có thể bỏ tick lại nếu muốn — xem 5.6).  
* Cặp đôi không nằm trong rule auto-tag này ở bất kỳ trường hợp nào.

### 6.3 Câu hỏi đặc biệt "Thích thầm" (Nhóm bạn)

* Khi chọn thể loại Nhóm bạn lúc setup phiên → hiển thị 1 checkbox nổi bật (không phải câu hỏi ẩn/mystery): *"Trong nhóm có ai đang 'thích thầm' không?"*  
* Nếu tick chọn → thêm 1 tag đặc biệt cho phiên, để hệ thống include các câu hỏi thuộc topic/category "thích thầm" vào pool câu hỏi khả dụng khi random.  
* Không giới hạn số lần loại câu này xuất hiện trong phiên — nó xuất hiện random như mọi câu hỏi khác trong pool.

### 6.4 Vote ẩn & auto-delete

* Vote ẩn cá nhân: ẩn vĩnh viễn với user đó (mọi phiên sau này).  
* Ngưỡng xóa toàn cục: count(QuestionVote where questionId \= X) / count(toàn bộ User trong hệ thống) ≥ 30% → isDeleted \= true, câu này biến mất khỏi pool của TẤT CẢ mọi người (kể cả người chưa từng vote nó).  
* Record của Question không bị xóa cứng — chỉ đánh cờ isDeleted, để các SessionAnswer lịch sử đã tồn tại vẫn truy vấn/hiển thị được bình thường (xem mục 4.1).  
* Không có giới hạn số lượng vote/ngày cho 1 user.

### 6.5 Cơ chế Copy phiên sang máy khác

* Bản chất là COPY, không phải MOVE/chuyển độc quyền. Khi nhập đúng sessionCode (8 số) ở máy đích:  
  * Hệ thống tạo ra một GameSession hoàn toàn mới (id mới), copy dữ liệu snapshot tại thời điểm đó từ phiên nguồn: toàn bộ SessionPlayer, toàn bộ SessionAnswer (lịch sử ai đã trả lời câu gì), categories đang active, crushQuestionEnabled.  
  * Trường copiedFromSessionId lưu lại tham chiếu tới phiên nguồn (chỉ để truy vết, không dùng cho logic chơi).  
  * Phiên nguồn (máy cũ) tiếp tục tồn tại và hoạt động độc lập — không bị khóa, không bị mất quyền, không có cảnh báo/thông báo nào gửi tới máy cũ. Từ thời điểm copy, 2 phiên là 2 bản ghi độc lập, các hành động chơi tiếp theo trên mỗi máy không đồng bộ qua lại với nhau.  
  * → Vì bản chất là copy nên không cần cơ chế thông báo "phiên đang bị chuyển đi" hay xử lý conflict giữa 2 máy — đây là điểm được đơn giản hoá đáng kể so với thiết kế "transfer độc quyền" ban đầu.  
* sessionCode (8 số) không hết hạn theo thời gian (khớp với việc GameSession không có expiredAt) và có thể được dùng để copy nhiều lần (không giới hạn số lần 1 mã được dùng để tạo phiên copy) — vì đây không phải hành động "khóa quyền", copy nhiều lần không gây xung đột dữ liệu.  
* Redis lock (theo sessionId) chỉ cần đảm bảo tính nhất quán cho các hành động đồng thời trong cùng 1 sessionId (VD: 2 tab cùng mở 1 phiên trên cùng máy) — không còn cần xử lý coordination giữa máy nguồn và máy đích vì chúng là 2 sessionId độc lập sau khi copy.

### 6.6 Ghi nhận & hiển thị người đóng góp câu hỏi

* Mỗi Question (nếu không phải câu seed hệ thống) lưu contributedByUserId.  
* Tên hiển thị (User.displayName) được resolve và hiển thị ngay trên mặt úp của thẻ trong lúc chọn (State C, mục 5.5) — trước khi người chơi biết nội dung câu hỏi là gì. Mục đích: tạo yếu tố thú vị/tò mò ("câu này của ai vậy?") và tôn vinh người đóng góp.  
* Nếu câu hỏi là seed hệ thống (không có người đóng góp) hoặc người đóng góp là guest chưa từng đặt nickname → hiển thị "Ẩn danh".  
* Không hiển thị lại tên người đóng góp ở mặt đã lật (mặt trước) — thông tin này chỉ có ý nghĩa ở giai đoạn *chọn thẻ*, mặt trước tập trung hoàn toàn vào câu hỏi và người trả lời (xem 7.2).

---

## 7\. UI/UX — Layout & Design Guidance chi tiết

### 7.1 Màn hình quay (State A \+ B, mục 5.5)

Layout (từ trên xuống, full-height mobile):

* Header mỏng: bên trái badge thể loại đang chơi (icon \+ tên, màu theo category), bên phải icon menu (3 gạch).  
* Khu vực giữa (chiếm \~60% chiều cao màn hình): bánh xe (wheel) hình tròn, chia các phần bằng nhau theo số người chơi, mỗi phần tô màu xen kẽ 2 tông trong bảng màu category hiện tại, tên người chơi viết dọc theo bán kính hoặc nằm ngang trong từng phần (ưu tiên dễ đọc hơn đẹp).  
* Dưới bánh xe: nút "QUAY" hình tròn lớn, nổi bật, màu tương phản mạnh với nền, có shadow/elevation để trông "bấm được".  
* Đáy màn hình: dòng nhỏ đếm số người chơi hiện tại \+ link nhỏ "Xem lịch sử phiên".

Animation quay:

* Khi bấm QUAY: bánh xe xoay với easing "ease-out" (nhanh → chậm dần), thời gian quay ngẫu nhiên nhẹ (2-4s) để tạo cảm giác hồi hộp thật, không cố định cứng.  
* Dừng: có tick nhẹ hoặc rung nhẹ (haptic nếu hỗ trợ) tại thời điểm dừng.  
* Không dùng âm thanh (sound effect) ở bất kỳ animation nào trong app (quay, lật thẻ, vote...) — chủ đích để ưu tiên không gian nói chuyện thật giữa người chơi, tránh app gây ồn/xao nhãng cuộc trò chuyện.  
* Sau khi dừng: toàn màn hình dimmed nhẹ, tên người trúng hiện to ở giữa (kiểu "toast lớn" full width) kèm hiệu ứng confetti rơi từ trên xuống trong \~1-1.5s, rồi tự động chuyển cảnh sang 3 thẻ úp.

### 7.2 3 thẻ úp — Card Selection (State C, mục 5.5)

Layout:

* 3 thẻ xếp ngang hàng, hơi overlap hoặc fan-out nhẹ (thẻ giữa cao hơn 2 thẻ bên, tạo cảm giác "bốc bài").  
* Mỗi thẻ mặt úp: nền màu solid theo category (không cần gradient phức tợp ở mặt úp — để phân biệt rõ với mặt trước sau khi lật), có icon trang trí nhẹ ở giữa (VD: dấu "?"), và dòng chữ nhỏ ở dưới cùng của thẻ: "Đóng góp bởi: \[Tên\]" — cỡ chữ nhỏ (\~12-13px), màu trắng/tương phản, căn giữa.  
* Tap vào 1 thẻ → animation flip 3D (trục Y) trong \~0.4-0.6s → 2 thẻ còn lại fade-out \+ scale-down đồng thời.

### 7.3 Thẻ câu hỏi — mặt trước sau khi lật (State D, mục 5.5)

Layout dọc, thứ tự từ trên xuống (giữ nguyên khung tổng, bổ sung chi tiết khoảng cách/tỷ lệ):

1. Tên người trả lời (\~10% chiều cao card): đặt trên cùng, chữ đậm (font-weight: 700), cỡ \~20-24px, có thể kèm 1 avatar tròn chữ cái đầu (background theo màu category, chữ trắng).  
2. Câu hỏi (\~50-55% chiều cao card — vùng lớn nhất): căn giữa cả theo chiều ngang và dọc trong vùng của nó, font to nhất toàn card (font-weight: 800, \~28-36px, auto-shrink nếu câu dài để không vỡ layout — dùng kỹ thuật kiểu clamp() theo độ dài text).  
3. Note hướng dẫn (\~15% chiều cao card): ngay dưới câu hỏi, cỡ chữ nhỏ (\~13-14px), màu xám nhạt/secondary, có thể có icon nhỏ (VD: dấu 💬) đứng trước để phân biệt trực quan với câu hỏi chính. Nội dung thay đổi theo type:  
   * yesno: "Nếu là câu hỏi Yes/No, hãy giải thích hoặc kể câu chuyện xoay quanh đó tối thiểu 3 câu."  
   * challenge: "Đây là câu hỏi thử thách — hãy thực hiện thử thách này\!"  
   * open\_ended: "Trả lời tự do theo cách của bạn."  
4. Nút vote ẩn (góc trên-phải của card, nổi trên layout chính, không chiếm không gian dòng): icon nhỏ dạng "..." hoặc "🚫", size touch-target đủ lớn (≥40x40px) nhưng icon visual nhỏ để không gây chú ý quá mức — đây là action phụ, không phải hành động chính của màn hình.  
5. Nút "Quay tiếp" (đáy card hoặc đáy màn hình, ngoài card): full-width, màu accent, luôn hiện sau khi lật xong.

### 7.4 Modal vote ẩn (State E, mục 5.5)

* Modal nhỏ, che phủ trung tâm màn hình, nền mờ phía sau (overlay tối 40-50% opacity):  
  * Icon cảnh báo nhẹ (không cần đỏ gắt, dùng tông vàng/cam trung tính).  
  * Text: "Ẩn câu hỏi này khỏi các lượt chơi sau của bạn?"  
  * 2 nút: "Huỷ" (secondary, outline) và "Đồng ý ẩn" (primary, filled).  
* Sau khi đồng ý: modal đóng, toast nhỏ dưới màn hình "Đã ẩn câu hỏi này" tự biến mất sau \~2s.

### 7.5 Màn hình chọn thể loại (mục 5.3)

* Grid 2x2 các thẻ lớn, mỗi thẻ: icon minh hoạ \+ tên thể loại, nền theo màu category (mục 7.6), border sáng \+ checkmark icon ở góc khi được chọn (không dùng riêng biệt "radio button" nhỏ — cả thẻ là touch target).  
* Checkbox "thích thầm" khi hiện ra: đặt ngay dưới grid, dạng 1 hàng full-width, nền nhạt (không cần màu category), icon 💌 hoặc 🤫 đứng trước label, checkbox to (≥24px) — chủ đích làm nó nổi bật, không phải ẩn/nhỏ.

### 7.6 Màu sắc & Typography

* Tinh thần thiết kế: vui, ấm áp, phù hợp không khí tụ tập bạn bè/cặp đôi — tránh quá "game nghiêm túc" hoặc quá "trẻ con".  
* Bảng màu theo thể loại:  
  * Cặp đôi: gradient hồng-đỏ ấm (\#FF6B81 → \#C44569)  
  * Nhóm nữ: gradient tím-hồng pastel (\#A29BFE → \#FD79A8)  
  * Nhóm nam: gradient xanh-navy năng động (\#4834D4 → \#0984E3)  
  * Nhóm bạn: gradient cam-vàng vui tươi (\#FDCB6E → \#E17055)  
  * Nền chung ngoài card: tối giản, trung tính (trắng/xám nhạt hoặc dark mode xám đậm) để card nổi bật.  
* Typography:  
  * Font chính: Baloo 2 (Google Fonts) — đã chốt, cần kiểm tra bộ dấu tiếng Việt khi implement thực tế (Baloo 2 hỗ trợ Vietnamese subset trên Google Fonts).  
  * Tên người trả lời: font-weight: 700, \~20-24px.  
  * Câu hỏi chính: font-weight: 800, \~28-36px, responsive/auto-shrink theo độ dài.  
  * Note: font-weight: 400-500, \~13-14px, màu xám.  
  * Tên người đóng góp (mặt úp): font-weight: 500, \~12-13px, màu trắng/tương phản với nền category.

### 7.7 Responsive

* Ưu tiên mobile-first (dùng chung 1 điện thoại truyền tay) — layout card nên chiếm gần full màn hình để dễ đọc khi để giữa bàn hoặc cầm gần.

---

## 8\. Monetization & Non-functional

* Ads: có kế hoạch tích hợp (vị trí, loại ads — banner/interstitial giữa lượt quay — cần quyết định thêm ở giai đoạn sau, chưa nằm trong phạm vi bản v1).  
* Không đa ngôn ngữ — chỉ tiếng Việt, không cần kiến trúc i18n phức tạp ở bản v1 (nhưng khuyến nghị vẫn tách text ra khỏi code từ đầu để dễ mở rộng sau nếu cần).

&nbsp;