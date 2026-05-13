# Documentation: Recommendation Service System

Tài liệu này mô tả chi tiết kiến trúc, logic nghiệp vụ và các thuật toán cốt lõi của hệ thống Gợi ý sách thông minh (Recommendation Service).

---

## 1. Tổng quan (Overview)
Hệ thống Recommendation Service chịu trách nhiệm cá nhân hóa trải nghiệm người dùng bằng cách gợi ý các cuốn sách phù hợp dựa trên sở thích cá nhân và hành vi cộng đồng. 

Hệ thống sử dụng mô hình **Hybrid Recommendation (2-Stage Pipeline)**: kết hợp giữa Lọc cộng tác (Collaborative Filtering) và Lọc dựa trên nội dung (Content-Based Filtering).

---

## 2. Công nghệ sử dụng (Tech Stack)
*   **Ngôn ngữ:** Python (FastAPI).
*   **CSDL Vector:** **Qdrant** (Lưu trữ Embeddings của sách).
*   **CSDL NoSQL:** **MongoDB** (Lưu trữ điểm tương tác `user_item_scores`).
*   **Caching:** **Redis** (Lưu kết quả gợi ý và session context).
*   **Message Broker:** **Kafka** (Đồng bộ dữ liệu hành vi và sự kiện sách).
*   **Machine Learning:** `implicit` (ALS), `sentence-transformers` (Embeddings).

---

## 3. Các thuật toán cốt lõi (Core Algorithms)

### 3.1. ALS (Alternating Least Squares) - Collaborative Filtering
*   **Mục đích:** Tìm kiếm các mối quan hệ ẩn giữa người dùng và sách dựa trên hành vi của cộng đồng.
*   **Logic:** Phân tách ma trận tương tác (Matrix Factorization) để dự đoán mức độ quan tâm của người dùng đối với những cuốn sách họ chưa từng đọc.
*   **Đặc điểm:** Giúp người dùng khám phá những cuốn sách mới nằm ngoài vùng nội dung họ thường xem nhưng phù hợp với "gu" của họ.

### 3.2. Content-Based Filtering (CBF) - Vector Search
*   **Mục đích:** Gợi ý sách dựa trên đặc tính nội dung tương đồng.
*   **Xử lý văn bản:** Sử dụng model `multilingual-e5-small` để chuyển hóa Title, Authors, Description thành Vector 384 chiều.
*   **Logic:** Tính toán khoảng cách Cosine Similarity trong Qdrant.
*   **User Profile:** Hệ thống xây dựng một "Vector sở thích" cho mỗi user bằng cách lấy trung bình cộng các vector của các cuốn sách họ đã tương tác cao nhất.

### 3.3. Hybrid Blending (Sự kết hợp hoàn hảo)
Hệ thống kết hợp cả hai thuật toán trên theo trọng số:
> **Final Score = (0.6 * ALS_Score) + (0.4 * CBF_Score)**

*   **Stage 1 (Candidate Generation):** ALS chọn ra 50 ứng viên tốt nhất.
*   **Stage 2 (Re-ranking):** Sử dụng CBF để xếp hạng lại 50 ứng viên đó theo sở thích nội dung cụ thể của người dùng.

---

## 4. Cơ chế tính điểm hành vi (Interaction Scoring)
Hệ thống lắng nghe Kafka và tích lũy điểm số cho cặp (User, Book) theo quy tắc:
*   **FAVORITE:** +5.0
*   **ADD_BOOKSHELF:** +4.0
*   **SEARCH_CLICK:** +3.0
*   **VIEW:** +1.0
*   **RATING:** (Số sao - 3.0) -> Ví dụ: 5 sao = +2.0, 1 sao = -2.0.
*   **READ_TIME:** (Số phút đọc * 0.1).

---

## 5. Các luồng gợi ý chính (Recommendation Flows)

### 5.1. Long-term Recommendations (`/recommendations/{user_id}`)
*   Kết quả từ quá trình huấn luyện Hybrid (chạy 6 tiếng/lần).
*   Được lưu trữ ổn định trong Redis.

### 5.2. Today's Picks (`/recommendations/{user_id}/today`)
*   Gợi ý theo thời gian thực dựa trên hành vi trong phiên làm việc (Session-based).
*   Nếu bạn vừa xem 1 cuốn sách, danh sách này sẽ ngay lập tức cập nhật để tìm các cuốn tương tự cuốn đó.

### 5.3. Similar Books (`/similar/{book_id}`)
*   Sử dụng thuần túy Vector Search trong Qdrant để tìm các sách tương đồng nhất về nội dung.

---

## 6. Xử lý bài toán Cold Start (Người dùng mới)
Hệ thống tự động chuyển đổi chế độ dựa trên lượng dữ liệu thu thập được:
1.  **Giai đoạn 1 (< 5 tương tác):** Gợi ý các sách đang là xu hướng toàn cầu (Global Trending).
2.  **Giai đoạn 2 (>= 5 tương tác):** Kích hoạt chế độ **CBF-only** (Gợi ý theo nội dung tương đồng).
3.  **Giai đoạn 3 (Sau chu kỳ huấn luyện đầu tiên):** Kích hoạt chế độ **Hybrid** đầy đủ.

---

## 7. Cơ chế đồng bộ và Bảo trì (Maintenance)
*   **Đồng bộ thực tế:** Luôn kiểm tra lại MongoDB của `book-service` trước khi trả kết quả để đảm bảo sách chưa bị xóa hoặc bị ẩn.
*   **Đồng bộ Vector:** Lắng nghe Kafka `book-events` để cập nhật Qdrant ngay khi sách có thay đổi.
*   **Huấn luyện định kỳ:** Một tiến trình Cron chạy mỗi 6 giờ để cập nhật lại mô hình ALS và làm mới Cache Redis cho toàn bộ người dùng.

---
*Tài liệu này được soạn thảo để hướng dẫn các kỹ sư phát triển nắm bắt nhanh hệ thống Recommendation.*
