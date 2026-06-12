import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import {
  BookOpen, Users, Tag, TrendingUp, Star, Heart,
  Eye, Activity,
} from 'lucide-react';
import { bookApi } from '../api/bookApi';
import { userApi } from '../api/userApi';
import { resolveMediaUrl } from '../config/env';

const COLORS = ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#79c0ff', '#a371f7', '#ffa657', '#56d364'];

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
        <p key={p.name} style={{ color: p.color || 'var(--text-primary)' }}>
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

  // Dữ liệu biểu đồ: top 10 sách theo lượt xem
  const chartData = trending.slice(0, 10).map((b) => ({
    name: b.title.length > 16 ? b.title.slice(0, 16) + '…' : b.title,
    'Lượt xem': b.totalViews,
    'Yêu thích': b.totalFavorites,
    'Đánh giá': +(b.averageRating?.toFixed(1) || 0),
  }));

  // Biểu đồ tròn phân bố thể loại
  const catMap: Record<string, number> = {};
  trending.forEach((b) => {
    const name = b.category?.name || 'Chưa phân loại';
    catMap[name] = (catMap[name] || 0) + 1;
  });
  const catPie = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Activity size={22} color="var(--accent)" />
            Bảng điều khiển
          </h1>
          <p className="page-subtitle">Tổng quan hệ thống Mạng xã hội sách</p>
        </div>
      </div>

      {/* ── Stats cards — 1 hàng ──────────────────────────────────────────── */}
      <div className="stats-grid stats-grid-6">
        <StatCard
          label="Tổng sách"
          value={trendLoad ? '…' : trending.length}
          icon={<BookOpen size={18} color="var(--accent)" />}
          iconBg="var(--accent-glow)"
          sub="đang trending"
        />
        <StatCard
          label="Tổng người dùng"
          value={userLoad ? '…' : users.length}
          icon={<Users size={18} color="var(--success)" />}
          iconBg="rgba(63,185,80,.15)"
          sub="tài khoản đã đăng ký"
        />
        <StatCard
          label="Thể loại"
          value={categories.length}
          icon={<Tag size={18} color="var(--warning)" />}
          iconBg="rgba(210,153,34,.15)"
          sub="thể loại sách"
        />
        <StatCard
          label="Tổng lượt xem"
          value={totalViews.toLocaleString()}
          icon={<Eye size={18} color="var(--info)" />}
          iconBg="rgba(121,192,255,.15)"
          sub="trong kỳ trending"
        />
        <StatCard
          label="Tổng yêu thích"
          value={totalFavs.toLocaleString()}
          icon={<Heart size={18} color="var(--danger)" />}
          iconBg="rgba(248,81,73,.15)"
          sub="lượt thêm yêu thích"
        />
        <StatCard
          label="Đánh giá TB"
          value={avgRating}
          icon={<Star size={18} color="var(--warning)" />}
          iconBg="rgba(210,153,34,.15)"
          sub="trung bình sao"
        />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="charts-grid">
        {/* Biểu đồ cột: Lượt xem & Yêu thích */}
        <div className="card">
          <div className="card-title"><TrendingUp size={16} color="var(--accent)" /> Top sách — Lượt xem &amp; Yêu thích</div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Bar dataKey="Lượt xem" fill="var(--accent-dim)" radius={[4,4,0,0]} />
              <Bar dataKey="Yêu thích" fill="var(--danger)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Biểu đồ đường: Đánh giá trung bình */}
        <div className="card">
          <div className="card-title"><Star size={16} color="var(--warning)" /> Top sách — Đánh giá trung bình</div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="Đánh giá" stroke="var(--warning)" strokeWidth={2.5} dot={{ fill: 'var(--warning)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Biểu đồ tròn: Phân bố thể loại */}
        <div className="card">
          <div className="card-title"><Tag size={16} color="var(--success)" /> Phân bố thể loại sách</div>
          {catPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={catPie}
                  cx="50%"
                  cy="44%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {catPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontWeight: 500 }}>
                      {value}
                    </span>
                  )}
                  wrapperStyle={{ paddingTop: 8, lineHeight: '22px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading-center text-muted">Chưa có dữ liệu thể loại</div>
          )}
        </div>
      </div>

      {/* ── Bảng sách trending ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title"><TrendingUp size={16} /> Sách đang trending (7 ngày qua)</div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Bìa sách</th>
                <th>Tên sách</th>
                <th>Thể loại</th>
                <th>Lượt xem</th>
                <th>Yêu thích</th>
                <th>Đánh giá</th>
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
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có dữ liệu</td></tr>
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
