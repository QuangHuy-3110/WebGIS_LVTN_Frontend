# Web GIS - Frontend Repository

Đây là thư mục chứa mã nguồn Giao diện (Frontend) cho hệ thống Web GIS. Ứng dụng này cung cấp giao diện tương tác bản đồ, tìm đường, phân trang hành chính, giao tiếp thời gian thực, tải ảnh chứa bảng hiệu để quét AI và kết xuất các lớp ranh giới, đường đi từ Local Map Server.

## 🚀 Tính năng nổi bật
* **Bản đồ trực quan:** Tích hợp `react-leaflet`, `ol` (OpenLayers) để hiển thị dữ liệu không gian.
* **Tích hợp Bản đồ nền (Base Maps):** Sử dụng OpenStreetMap (OSM) làm lớp dữ liệu bản đồ nền theo ý chuẩn, kết hợp với hệ thống MapTiler để cung cấp các lớp bản đồ chất lượng cao (như Topo layers).
* **Quản lý không gian & Tìm kiếm đường đi:** Cung cấp giao diện người dùng trơn tru để hiển thị vị trí các cửa hàng, chức năng tìm kiếm người dùng (Lịch sử tìm kiếm), và tính toán lộ trình tối ưu.
* **Giao diện Admin:** Giao diện hỗ trợ quản trị viên thêm mới các cửa hàng (Tích hợp AI dự đoán các trường thông tin từ bảng hiệu), cảnh báo chống trùng lặp dữ liệu không gian (Fuzzy matching).

## 🛠 Công nghệ sử dụng
* Khung ứng dụng: [React](https://reactjs.org/)
* Map libraries: [Leaflet](https://leafletjs.com/), [OpenLayers](https://openlayers.org/)
* Map Server Engine: Cổng chia lớp GeoServer OGC (WMS/WFS)

## ⚙️ Hướng dẫn cài đặt và chạy Local từ A-Z

Để hệ thống giao diện chạy lên có bản đồ đường xá, bạn cài đặt theo trật tự 4 bước sau (bao gồm cả việc dựng Map Server cục bộ).

### Yêu cầu nền tảng
* Node.js (khuyến nghị Node v18.x trở lên)
* Java Runtime Environment JRE 8 hoặc 11 (Cần thiết để bật Local GeoServer)

### BƯỚC 1: Dựng GeoServer (Map Server) - Thành phần làm nền
Mã nguồn React đang ngầm trỏ đến nguồn tài nguyên `localhost:8080/geoserver` lấy bản đồ. Nếu bỏ qua bước này Map sẽ trắng trơn hoặc mất các phần phân vùng.
1. Khởi tạo: Vào [https://geoserver.org](https://geoserver.org) chọn bản "Binaries" độc lập.
2. Tại máy bạn, giải nén GeoServer, vào `/bin/` chạy tệp `startup.bat` (Windows) hoặc `startup.sh` (Linux).
3. Mở Chrome vào `http://localhost:8080/geoserver` (Account Default là `admin` mật khẩu `geoserver`).
4. **Chia lớp Bản đồ (Publish Layers)**
   * Set Workspace (Trạm làm việc) tên `cantho_map`. 
   * Tại Data Store (nguồn Database kết nối Postgres PostGIS từ Backend).
   * Tại mục "Publish", xuất 2 bảng/lớp Layer OpenStreetMap quan trọng là: `planet_osm_line` (chứa dữ liệu dây đường đi) và `ranh_gioi_can_tho` (Phân vùng hành chính).
5. **Đổ Màu Lớp (Add Styling):** Up SLD/CSS thiết kế đường cho server chạy nền vào tên mẫu: `style_duong_di` và `style_ranh_gioi_ninh_kieu`. Gán vào cho Layer. 

*(Map Layer đã Launching Server xong)*

### BƯỚC 2: Cài đặt Node Modules (React)
Dùng Terminal đi vào thư mục kho giao diện gốc (`frontend/`):
```bash
npm install
```

### BƯỚC 3: Cấu hình Môi trường Vòng lặp (`.env`)
Tạo File `.env` chứa 3 khóa điều khiển máy chủ cho Web App Client hiểu cổng:
```env
REACT_APP_MAPTILER_KEY=your_key_here
REACT_APP_GEOSERVER_URL=http://localhost:8080/geoserver
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

### BƯỚC 4: Khởi chạy Giao Diện Web
Dùng lệnh:
```bash
npm start
```
*   Chrome sẽ vọt tab ra tại HTTP `localhost:3000`. 
*   **Workflow hoạt động là:** Khi Browser nạp trang -> Nện BaseMap MapTiler -> Chặn lấy `http://localhost:8080` của nhánh GeoServer vẽ đè dây đường OSM và tô ranh giới Cần Thơ lên. Người bấm Request "Tìm đường" -> UI ném Ping thẳng qua địa chỉ `http://localhost:8000` của Django AI Backend và đón nhận JSON Render ra màn hình thành quả.*

---

## 📦 Xuất Gói (Build Deploy)

Nếu muốn đưa lên Server thật (Nginx statics, Vercel..):
```bash
npm run build
```
*(Code được tối giảm dung lượng và thả vào một Folder `/build` ready to push.*)
