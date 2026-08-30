# EduMate - Kho học liệu số

Nền tảng Kho tài liệu, Lập thời khóa biểu thông minh và Trợ lý giải thuật AI dành cho sinh viên Khoa Công nghệ Thông tin - Trường Đại học Sư phạm TP.HCM (HCMUE).

---

## 🌟 Tính năng chính

- **📚 Kho tài liệu học tập (StudyVault):** Tra cứu, lọc theo môn học/học kỳ, xem trước PDF, mã nguồn, bài giảng và tải tài liệu môn học.
- **📅 Trình xếp thời khóa biểu (Schedule Maker):** Tự động tạo và tối ưu hóa thời khóa biểu không trùng lịch, hỗ trợ xuất hình ảnh PNG chất lượng cao và file PDF.
- **🤖 Trợ lý AI Phân tích thuật toán:** Tích hợp mô hình Gemini AI để phân tích độ phức tạp thời gian/không gian ($O(N)$), OCR hình ảnh đề bài và gợi ý thuật toán tối ưu.
- **🛡️ Cổng quản trị viên an toàn:** Xét duyệt bài đóng góp, quản lý phản hồi với xác thực qua backend server (chống brute-force & timing attacks).

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js**: Phiên bản 18.x hoặc mới hơn
- **npm** hoặc **yarn**

### 2. Cài đặt các thư viện
```bash
npm install
```

### 3. Cấu hình biến môi trường
Sao chép file mẫu cấu hình `.env.example` thành `.env`:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Mở file `.env` và điền thông tin dự án Firebase cùng khóa API của bạn:
```env
# Cấu hình Firebase Web Client
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)

# Mật khẩu quản trị viên backend
ADMIN_PASSWORD=your_secure_admin_password

# Khóa Gemini API (Tùy chọn cho tính năng AI)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Khởi chạy ứng dụng
```bash
npm run dev
```

Mở trình duyệt và truy cập: **`http://localhost:3000`**

---

## 🔒 Bảo mật (Zero-Leak Architecture)
- Toàn bộ bí mật máy chủ (`GEMINI_API_KEY`, `ADMIN_PASSWORD`) được cô lập 100% trong Node.js backend.
- Các file `.env`, chứng chỉ bảo mật và cấu hình tài khoản dịch vụ đã được đưa vào `.gitignore` để bảo vệ mã nguồn khi đưa lên GitHub công khai.

---

## 📄 Bản quyền
Phát triển bởi Cộng đồng Sinh viên FIT - HCMUE.
