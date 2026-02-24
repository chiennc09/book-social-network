// Giả lập API lấy cấu hình Menu
export const appService = {
  // Lấy danh sách bộ lọc Feed (Cho màn Home)
  async getFeedFilters() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'foryou', label: 'Dành cho bạn', icon: 'heart' },
          { id: 'following', label: 'Đang theo dõi', icon: 'users' },
          { id: 'saved', label: 'Bài viết đã lưu', icon: 'bookmark' },
        ]);
      }, 300);
    });
  },

  // Lấy danh sách cài đặt (Cho màn Profile)
  async getSettingsMenu() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'account', label: 'Tài khoản', icon: 'user' },
          { id: 'privacy', label: 'Quyền riêng tư', icon: 'lock' },
          { id: 'accessibility', label: 'Trợ năng', icon: 'eye' },
          { id: 'logout', label: 'Đăng xuất', icon: 'log-out', danger: true },
        ]);
      }, 300);
    });
  }
};