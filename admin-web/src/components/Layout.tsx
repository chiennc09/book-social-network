import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Tag, Brain,
  BarChart3, LogOut, BookMarked,
} from 'lucide-react';
import { authApi } from '../api/authApi';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={16} />, to: '/' },
      { label: 'Statistics',  icon: <BarChart3 size={16} />, to: '/statistics' },
    ],
  },
  {
    section: 'Content',
    items: [
      { label: 'Books',      icon: <BookOpen size={16} />, to: '/books' },
      { label: 'Categories', icon: <Tag size={16} />,      to: '/categories' },
    ],
  },
  {
    section: 'Users',
    items: [
      { label: 'Users',      icon: <Users size={16} />, to: '/users' },
    ],
  },
  {
    section: 'AI / Recommend',
    items: [
      { label: 'Recommendations', icon: <Brain size={16} />, to: '/recommendations' },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

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
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            <BookMarked size={15} />
            Book Social Network — Admin Dashboard
          </div>
          <div className="flex items-center gap-2">
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>A</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
