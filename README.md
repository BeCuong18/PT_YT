# 🚀 TubeThumb Master Analytics - Hướng dẫn Triển khai

Ứng dụng phân tích xu hướng YouTube chuyên sâu sử dụng Gemini 3.0 AI và Google Search Grounding.

## 🛠 Yêu cầu chuẩn bị
1. **YouTube Data API Key**: Lấy tại [Google Cloud Console](https://console.cloud.google.com/). 
   - Kích hoạt "YouTube Data API v3".
   - Tạo Credential -> API Key.
2. **Gemini API Key**: Lấy tại [Google AI Studio](https://aistudio.google.com/).

## 📦 Cách đóng gói để sử dụng
Ứng dụng này được thiết kế theo cấu trúc React hiện đại.

### Cách 1: Triển khai lên Vercel/Netlify (Khuyên dùng)
1. Đẩy mã nguồn lên một kho lưu trữ GitHub (Private hoặc Public).
2. Kết nối GitHub với [Vercel](https://vercel.com) hoặc [Netlify](https://netlify.com).
3. Trong phần **Environment Variables**, thêm biến:
   - `API_KEY`: [Dán Gemini API Key của bạn vào đây]
4. Nhấn **Deploy**. Hệ thống sẽ tự động đóng gói và cung cấp cho bạn một đường link `.vercel.app` hoặc `.netlify.app`.

### Cách 2: Đóng gói thủ công (Local Build)
Nếu bạn muốn tự chạy trên server riêng:
1. Chạy lệnh: `npm install` để cài đặt thư viện.
2. Chạy lệnh: `npm run build` để đóng gói.
3. Toàn bộ mã nguồn nằm trong thư mục `dist/`. Bạn chỉ cần copy thư mục này lên Hosting/Server của mình.

## 📱 Tính năng PWA (Cài đặt như App)
Ứng dụng đã được tích hợp `manifest.json`. Sau khi triển khai lên HTTPS:
- **Trên Chrome (Desktop)**: Nhấn vào biểu tượng "Cài đặt" ở cuối thanh địa chỉ.
- **Trên iPhone (Safari)**: Nhấn nút "Chia sẻ" -> "Thêm vào màn hình chính".
- **Trên Android**: Nhấn "Thêm vào màn hình chính" khi có thông báo hiện lên.

## ⚠️ Lưu ý bảo mật
- **Gemini API Key**: Được bảo mật phía Server/Build-time.
- **YouTube API Key**: Được lưu trữ an toàn trong `localStorage` trên trình duyệt cá nhân của người dùng, không bao giờ gửi về máy chủ của bạn.

---
Phát triển bởi Senior Frontend Engineer với Gemini AI.
