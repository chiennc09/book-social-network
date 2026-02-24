# Hướng dẫn sử dụng Post API (Mạng Xã Hội Sách)

Tất cả các API dưới đây yêu cầu có `Authorization: Bearer <token>` truyền trong header.
Đường dẫn gốc (Base URL) mặc định thường là: `http://localhost:8080` (hoặc cổng mà post-service đang chạy).

---

## 1. Tạo bài viết (Create Post)
- **Endpoint:** `POST /create`
- **Mô tả:** Đăng bài viết mới, có thể gắn Tag một sách (`bookId`) hoặc chia sẻ/repost lại một bài viết khác (`isRepost`, `originalPostId`).
- **Body / Payload (JSON):**

```json
{
  "content": "Cuốn sách này rất hay, đặc biệt là chương 3!",
  "bookId": "65babc12345",
  "isRepost": false,
  "originalPostId": null
}
```

## 2. Lấy Bài viết cá nhân (My Posts)
- **Endpoint:** `GET /my-posts?page=1&size=10`
- **Mô tả:** Hiển thị danh sách các bài viết do user đang đăng nhập tạo.

## 3. Lấy Bảng tin tổng hợp (All Posts)
- **Endpoint:** `GET /all?page=1&size=10`
- **Mô tả:** Lấy toàn bộ các bài đăng gần đây nhất trên hệ thống mạng xã hội.

## 4. Lấy Bảng tin cá nhân hóa (New Feed)
- **Endpoint:** `GET /feed?page=1&size=10`
- **Mô tả:** Lấy bài đăng của **chính user đó** cộng với bài đăng của **bạn bè user đó**.

## 5. Thích / Bỏ thích Bài viết (Like / Unlike)
- **Thích bài viết:**
  - **Endpoint:** `POST /{postId}/like`
  - **Body:** *(Không cần)*
- **Bỏ thích bài viết:**
  - **Endpoint:** `DELETE /{postId}/like`
  - **Body:** *(Không cần)*

## 6. Đăng Bình luận (Add Comment)
- **Endpoint:** `POST /{postId}/comments`
- **Mô tả:** Thêm bình luận vào bài viết. Nếu đây là một trả lời (reply) cho một bình luận khác, hãy truyền chuỗi id của bình luận cha vào thuộc tính `parentId`.
- **Body / Payload (JSON) - Bình luận gốc:**

```json
{
  "content": "Tôi cũng đồng ý, tác giả viết đoạn đó rất sắc sảo."
}
```

- **Body / Payload (JSON) - Trả lời (Reply) một bình luận khác:**

```json
{
  "content": "Bạn thấy đoạn nào đắt giá nhất vậy?",
  "parentId": "65cbde123abc"
}
```

## 7. Lấy danh sách Bình luận (Get Comments)
- **Endpoint:** `GET /{postId}/comments?page=1&size=10`
- **Mô tả:** Lấy danh sách các **bình luận gốc** (`parentId` là null) của một bài viết. Mỗi Item sẽ trả về thuộc tính `replyCount` (Số lượng phản hồi).

## 8. Lấy danh sách Phản hồi của một bình luận (Get Replies)
- **Endpoint:** `GET /{postId}/comments/{commentId}/replies?page=1&size=10`
- **Mô tả:** Lấy danh sách các bình luận con trực thuộc một bình luận cha cụ thể.

---
**Gợi ý test Postman:** 
1. Đăng nhập để lấy Token.
2. Tại các Request tạo Bài / Bình Luận, điền `JSON` vào tab `Body -> raw -> JSON`.
3. Nhớ gắn `Bearer Token` vào tab `Authorization`.
