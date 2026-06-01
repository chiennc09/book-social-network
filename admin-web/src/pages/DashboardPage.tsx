import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  BookOpen, Users, Tag, TrendingUp, Star, Heart,
  Eye, Activity,
} from 'lucide-react';
import { bookApi } from '../api/bookApi';
import { userApi } from '../api/userApi';
import { resolveMediaUrl } from '../config/env';

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <b>{p.value?.toLocaleString()}</b>
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { data: trending = [], isLoading: trendLoad } = useQuery({
    queryKey: ['trending', 7, 20],
    queryFn: () => bookApi.getTrending(7, 20),
  });

  const { data: users = [], isLoading: userLoad } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => bookApi.getAllCategories(),
  });

  const totalViews   = trending.reduce((s, b) => s + (b.totalViews || 0), 0);
  const totalFavs    = trending.reduce((s, b) => s + (b.totalFavorites || 0), 0);
  const avgRating    = trending.length
    ? (trending.reduce((s, b) => s + (b.averageRating || 0), 0) / trending.length).toFixed(1)
    : '—';

  // Chart data: top 10 books by views
  const chartData = trending.slice(0, 10).map((b) => ({
    name: b.title.length > 16 ? b.title.slice(0, 16) + '…' : b.title,
    Views: b.totalViews,
    Favorites: b.totalFavorites,
    Rating: +(b.averageRating?.toFixed(1) || 0),
  }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={22} color="var(--accent)" />
            Dashboard
          </h1>
          <p className="page-subtitle">Overview of Book Social Network</p>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard
          label="Total Books"
          value={trendLoad ? '…' : trending.length}
          icon={<BookOpen size={18} color="var(--accent)" />}
          iconBg="var(--accent-glow)"
          sub="in trending window"
        />
        <StatCard
          label="Total Users"
          value={userLoad ? '…' : users.length}
          icon={<Users size={18} color="var(--success)" />}
          iconBg="rgba(63,185,80,.15)"
          sub="registered accounts"
        />
        <StatCard
          label="Categories"
          value={categories.length}
          icon={<Tag size={18} color="var(--warning)" />}
          iconBg="rgba(210,153,34,.15)"
          sub="book genres"
        />
        <StatCard
          label="Total Views"
          value={totalViews.toLocaleString()}
          icon={<Eye size={18} color="var(--info)" />}
          iconBg="rgba(121,192,255,.15)"
          sub="across trending books"
        />
        <StatCard
          label="Total Favorites"
          value={totalFavs.toLocaleString()}
          icon={<Heart size={18} color="var(--danger)" />}
          iconBg="rgba(248,81,73,.15)"
          sub="hearts given"
        />
        <StatCard
          label="Avg. Rating"
          value={avgRating}
          icon={<Star size={18} color="var(--warning)" />}
          iconBg="rgba(210,153,34,.15)"
          sub="across trending books"
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title"><TrendingUp size={16} color="var(--accent)" /> Top Books — Views & Favorites</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="Views" fill="var(--accent-dim)" radius={[4,4,0,0]} />
              <Bar dataKey="Favorites" fill="var(--danger)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title"><Star size={16} color="var(--warning)" /> Top Books — Average Rating</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Rating" stroke="var(--warning)" strokeWidth={2} dot={{ fill: 'var(--warning)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Trending Books table ──────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title"><TrendingUp size={16} /> Trending Books (Last 7 days)</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cover</th>
                <th>Title</th>
                <th>Category</th>
                <th>Views</th>
                <th>Favorites</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {trending.slice(0, 10).map((book, i) => (
                <tr key={book.id}>
                  <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                  <td>
                    {book.coverImage
                      ? <img src={resolveMediaUrl(book.coverImage)} alt={book.title} className="book-cover-thumb" />
                      : <div className="book-cover-thumb" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>📖</div>
                    }
                  </td>
                  <td>
                    <div className="font-semibold truncate" style={{ maxWidth: 200 }}>{book.title}</div>
                    <div className="text-xs text-muted">{book.authors?.join(', ')}</div>
                  </td>
                  <td>
                    {book.category
                      ? <span className="badge badge-blue">{book.category.name}</span>
                      : <span className="text-muted text-xs">—</span>
                    }
                  </td>
                  <td>{book.totalViews?.toLocaleString()}</td>
                  <td>{book.totalFavorites?.toLocaleString()}</td>
                  <td>
                    <span style={{ color: 'var(--warning)' }}>★</span> {book.averageRating?.toFixed(1)}
                    <span className="text-xs text-muted"> ({book.ratingCount})</span>
                  </td>
                </tr>
              ))}
              {!trendLoad && trending.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Stat card component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, iconBg, sub }: {
  label: string; value: string | number;
  icon: React.ReactNode; iconBg: string; sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" style={{ background: iconBg }}>{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
