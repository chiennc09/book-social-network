import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Tag, Brain,
  BarChart3, LogOut, BookMarked, Sun, Moon,
} from 'lucide-react';
import { authApi } from '../api/authApi';
import { useTheme } from '../context/ThemeContext';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Tổng quan',
    items: [
      { label: 'Bảng điều khiển', icon: <LayoutDashboard size={16} />, to: '/' },
      { label: 'Thống kê',  icon: <BarChart3 size={16} />, to: '/statistics' },
    ],
  },
  {
    section: 'Nội dung',
    items: [
      { label: 'Sách',      icon: <BookOpen size={16} />, to: '/books' },
      { label: 'Thể loại', icon: <Tag size={16} />,      to: '/categories' },
    ],
  },
  {
    section: 'Người dùng',
    items: [
      { label: 'Người dùng', icon: <Users size={16} />, to: '/users' },
    ],
  },
  {
    section: 'AI / Gợi ý',
    items: [
      { label: 'Gợi ý sách', icon: <Brain size={16} />, to: '/recommendations' },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <BookMarked size={22} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            Book<span>Admin</span>
            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)', marginTop: 2 }}>
              Workspace
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <div className="nav-section-title">{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout} id="sidebar-logout">
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            <BookMarked size={15} />
            Mạng xã hội sách — Trang quản trị
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle button */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              id="theme-toggle"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              <span className="theme-toggle-track">
                <span className="theme-toggle-thumb">
                  {theme === 'dark'
                    ? <Moon size={13} strokeWidth={2} />
                    : <Sun size={13} strokeWidth={2} />
                  }
                </span>
              </span>
              <span className="theme-toggle-label">
                {theme === 'dark' ? 'Tối' : 'Sáng'}
              </span>
            </button>

            <div className="topbar-divider" />
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>A</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Quản trị viên</span>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
