# Hướng dẫn triển khai – App theo dõi công việc Phòng KT–AT

Kiến trúc: **GitHub Pages** (giao diện `web/`) + **Cloudflare Worker** (`worker/src/index.js`) + **D1** (dữ liệu) + **R2** (tệp đính kèm) + **Cron 15 phút** (nhắc việc) + **Bot Telegram** (thông báo).

Tên menu trên Cloudflare hay thay đổi giữa các đợt cập nhật giao diện. Không thấy đúng tên thì gõ `D1`, `R2` hoặc `Workers` vào ô tìm kiếm trên đầu trang Dashboard.

---

## Bước 1 – Tạo database D1

1. Dashboard → **Storage & Databases → D1** → **Create database**, tên: `qlcv`.
2. Mở database vừa tạo → tab **Console**.
3. Mở file `worker/schema-console.sql`, copy **toàn bộ**, dán vào ô Console → **Execute**.
   - Dùng bản `-console.sql` (không có dòng chú thích `--`). Bản `schema.sql` có chú thích, chỉ dùng với `wrangler d1 execute --file=`.
4. Kiểm tra: tab **Tables** (hoặc nút **Explore Data**) thấy 11 bảng: `departments, users, tasks, task_members, activities, attachments, notifications, notify_log, settings, login_attempts, admin_log`.

## Bước 2 – Tạo kho tệp R2 (đính kèm ảnh, tài liệu)

1. Dashboard → **R2 Object Storage** → **Create bucket**, tên: `qlcv-files`.
2. Lần đầu bật R2, Cloudflare có thể yêu cầu khai báo phương thức thanh toán. Dưới 10 GB lưu trữ vẫn miễn phí.
3. Nếu chưa muốn bật R2: bỏ qua bước này. App vẫn chạy đầy đủ, chỉ ẩn nút đính kèm.

## Bước 3 – Tạo bot Telegram

1. Trong Telegram, mở **@BotFather** → gõ `/newbot`.
2. Đặt tên hiển thị (vd: `Công việc KT-AT`) và username kết thúc bằng `bot` (vd: `ktat_congviec_bot`).
3. BotFather trả về **token** dạng `123456789:AA...`. Giữ kín token này.

## Bước 4 – Tạo Worker

1. Dashboard → **Workers & Pages** → **Create** → **Create Worker**, tên: `qlcv-api` → **Deploy** (bản mẫu).
2. **Edit code** → xoá hết nội dung mẫu → dán toàn bộ `worker/src/index.js` → **Save and deploy**.
3. Ghi lại địa chỉ Worker, dạng `https://qlcv-api.<tên-tài-khoản>.workers.dev`.

### 4a. Bindings (Settings → Bindings → Add)

| Loại | Tên biến (bắt buộc đúng) | Trỏ tới |
|---|---|---|
| D1 database | `DB` | `qlcv` |
| R2 bucket | `FILES` | `qlcv-files` (bỏ qua nếu chưa bật R2) |

### 4b. Biến môi trường (Settings → Variables and Secrets)

| Tên | Loại | Giá trị |
|---|---|---|
| `SESSION_SECRET` | **Secret** | Chuỗi ngẫu nhiên ≥ 32 ký tự (gõ bừa chữ + số, không cần nhớ) |
| `SETUP_KEY` | **Secret** | Mã dùng 1 lần để tạo tài khoản quản trị đầu tiên |
| `TG_BOT_TOKEN` | **Secret** | Token lấy ở Bước 3 |
| `TG_WEBHOOK_SECRET` | **Secret** | Chuỗi ngẫu nhiên, chỉ gồm chữ, số, `_`, `-` |
| `TG_BOT_USERNAME` | Text | Username bot, không có `@` (vd `ktat_congviec_bot`) |
| `APP_URL` | Text | Địa chỉ trang web ở Bước 5 (vd `https://<github-user>.github.io/qlcv/`) |
| `ALLOWED_ORIGINS` | Text | Gốc trang web, không có đường dẫn (vd `https://<github-user>.github.io`) |

Secret không bao giờ ghi vào file code hay gửi qua tin nhắn.

### 4c. Lịch chạy nhắc việc (Settings → Triggers → Cron Triggers → Add)

- Chọn **Every 15 minutes** hoặc nhập `*/15 * * * *`.
- Worker tự tính giờ Việt Nam: nhắc hạn trước 24h / 2h, báo quá hạn, nhắc 8h00 và 16h30 từ Thứ Hai đến Thứ Sáu, bỏ qua ngày nghỉ lễ khai báo trong app.

Kiểm tra: mở địa chỉ Worker trên trình duyệt, thấy dòng **"QLCV API đang chạy"** là được.

## Bước 5 – Đưa giao diện lên GitHub Pages

1. Tạo repository mới (vd `qlcv`), có thể để Private nếu tài khoản GitHub hỗ trợ Pages cho repo private; không thì để Public (code giao diện không chứa bí mật nào).
2. Mở `web/index.html`, sửa **đúng 1 dòng** gần đầu phần script:
   ```js
   const API_URL = 'https://qlcv-api.<tên-tài-khoản>.workers.dev';
   ```
3. Upload 6 file trong thư mục `web/` lên gốc repository: `index.html, manifest.json, sw.js, icon-192.png, icon-512.png, icon-maskable-512.png`.
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / thư mục `/ (root)` → Save.
5. Sau 1–2 phút có địa chỉ `https://<github-user>.github.io/qlcv/`. Quay lại Bước 4b cập nhật `APP_URL` và `ALLOWED_ORIGINS` cho khớp.

## Bước 6 – Cài đặt lần đầu trong app

1. Mở địa chỉ trang web → màn **Cài đặt lần đầu** hiện ra.
2. Nhập `SETUP_KEY`, họ tên người giữ tài khoản quản trị, tên đăng nhập, mật khẩu → **Tạo tài khoản quản trị**.
3. Đăng nhập bằng tài khoản quản trị → **Quản trị hệ thống**:
   - Tab **Phòng ban** → **Thêm phòng ban**: mã `KTAT`, tên `Phòng Kỹ thuật – An toàn`.
   - Tab **Tài khoản** → **Nhập danh sách** → chọn phòng KTAT → dán:
     ```
     Hoàng Anh Dũng | Trưởng phòng
     Đinh Văn Hùng | Phó phòng
     Bùi Công Kỳ | Phó phòng
     Lương Xuân Anh | Kỹ thuật viên
     Trần Viết Thắng | Kỹ thuật viên
     Ngô Hoàng Sơn | Kỹ thuật viên
     Phùng Viết Sang | Kỹ thuật viên
     ```
   - App tạo tên đăng nhập (`dungha, hungdv, kybc, anhlx, thangtv, sonnh, sangpv`) và **mật khẩu tạm hiện đúng 1 lần** → bấm **Sao chép danh sách**, gửi riêng từng người. Lần đăng nhập đầu, mỗi người bắt buộc đổi mật khẩu.
   - Tab **Telegram** → **Cài đặt webhook** → thông báo "Đã cài webhook cho @...".
   - Tab **Cài đặt**: chỉnh ngưỡng quá tải / rảnh, khai báo ngày nghỉ lễ trong năm.
4. Sau khi xong, có thể xoá biến `SETUP_KEY` trên Worker (màn Cài đặt lần đầu sẽ không mở lại được nữa vì đã có quản trị).

## Bước 7 – Mỗi người dùng

1. Mở link trang web trên điện thoại → đăng nhập → đặt mật khẩu mới.
2. **Tài khoản → Kết nối Telegram** → Telegram mở ra → bấm **Start**. App tự báo "Đã kết nối".
3. Cài lên màn hình chính: Android (Chrome) ⋮ → *Thêm vào màn hình chính*; iPhone (Safari) → Chia sẻ → *Thêm vào MH chính*.

---

## Vận hành

- **Quên mật khẩu**: Quản trị → Tài khoản → **Cấp lại MK** (mật khẩu cũ và mọi phiên đăng nhập hết hiệu lực ngay).
- **Nghỉ việc**: Sửa → bỏ chọn *Đang hoạt động* (khóa ngay, lịch sử công việc giữ nguyên).
- **Thêm phòng ban khi mở rộng**: thêm phòng ban + nhập danh sách, không sửa code. Ban Giám đốc: tạo tài khoản vai trò *Ban Giám đốc*, để trống phòng ban.
- **Sửa dữ liệu lặt vặt trực tiếp**: dùng tab **Studio** của D1 (sửa kiểu bảng tính, xem trước câu lệnh trước khi chạy) thay vì gõ SQL tay.
- **Cập nhật code sau này**: Worker → Edit code → dán bản mới → Save and deploy; giao diện → upload đè `index.html` lên GitHub (nhớ giữ nguyên dòng `API_URL`). Nếu bản mới có thêm cột/bảng sẽ kèm file `migrate-<n>-console.sql` — chạy file đó trên D1 Console **trước** khi dán code Worker mới.
- **Chạy thử nhắc việc**: Quản trị → Telegram → *Gửi nhắc 8h00 ngay* / *Gửi nhắc 16h30 ngay*.
- **Chi phí**: 7–60 người dùng nằm trong gói miễn phí của Cloudflare (Workers 100.000 lượt gọi/ngày, D1 5 GB, R2 10 GB).

## Kiểm tra nhanh sau triển khai

| Việc | Kết quả mong đợi |
|---|---|
| Mở địa chỉ Worker | "QLCV API đang chạy" |
| TP giao 1 việc cho 1 NV đã kết nối Telegram | NV nhận tin "Việc mới được giao" kèm nút *Mở công việc* |
| NV kéo tiến độ 100% → Trình | TP/PP nhận tin trình duyệt |
| PP bấm Duyệt | Việc chuyển "Chờ LĐ công ty duyệt" |
| Gõ `/viec` với bot | Bot trả danh sách việc đang làm |
