import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { BarChart3, BookOpen, Star, Eye, Heart, Tag } from 'lucide-react';
import { bookApi } from '../api/bookApi';
import { resolveMediaUrl } from '../config/env';

const COLORS = ['#58a6ff', '#3fb950', '#f85149', '#d29922', '#79c0ff', '#a371f7', '#ffa657', '#56d364'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || 'var(--text-primary)' }}>
          {p.name}: <b>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</b>
        </p>
      ))}
    </div>
  );
};

export default function StatisticsPage() {
  const { data: trending30 = [] } = useQuery({ queryKey: ['trending30'], queryFn: () => bookApi.getTrending(30, 20) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => bookApi.getAllCategories() });

  // Top sách theo lượt xem (30 ngày)
  const topViews = trending30.slice(0, 8).map((b) => ({
    name: b.title.length > 14 ? b.title.slice(0, 14) + '…' : b.title,
    'Lượt xem': b.totalViews,
  }));

  // Top sách theo đánh giá
  const topRated = [...trending30]
    .filter((b) => b.ratingCount > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 8)
    .map((b) => ({
      name: b.title.length > 14 ? b.title.slice(0, 14) + '…' : b.title,
      'Đánh giá': +b.averageRating.toFixed(2),
      'Lượt đánh giá': b.ratingCount,
    }));

  // Top sách theo yêu thích
  const topFavs = [...trending30]
    .sort((a, b) => b.totalFavorites - a.totalFavorites)
    .slice(0, 8)
    .map((b) => ({
      name: b.title.length > 14 ? b.title.slice(0, 14) + '…' : b.title,
      'Yêu thích': b.totalFavorites,
    }));

  // Phân bố thể loại (biểu đồ tròn)
  const catMap: Record<string, number> = {};
  trending30.forEach((b) => {
    const name = b.category?.name || 'Chưa phân loại';
    catMap[name] = (catMap[name] || 0) + 1;
  });
  const catPie = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const totalViews   = trending30.reduce((s, b) => s + b.totalViews, 0);
  const totalFavs    = trending30.reduce((s, b) => s + b.totalFavorites, 0);
  const avgRating    = trending30.length
    ? (trending30.reduce((s, b) => s + b.averageRating, 0) / trending30.length).toFixed(2)
    : '—';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><BarChart3 size={22} color="var(--accent)" /> Thống kê</h1>
          <p className="page-subtitle">Dữ liệu thống kê 30 ngày gần đây</p>
        </div>
      </div>

      {/* Thẻ tóm tắt */}
      <div className="stats-grid">
        <StatCard label="Sách trong top 30 ngày" value={trending30.length} icon={<BookOpen size={18} color="var(--accent)" />} iconBg="var(--accent-glow)" />
        <StatCard label="Tổng lượt xem (30 ngày)" value={totalViews.toLocaleString()} icon={<Eye size={18} color="var(--info)" />} iconBg="rgba(121,192,255,.15)" />
        <StatCard label="Tổng yêu thích (30 ngày)" value={totalFavs.toLocaleString()} icon={<Heart size={18} color="var(--danger)" />} iconBg="rgba(248,81,73,.15)" />
        <StatCard label="Đánh giá TB (30 ngày)" value={avgRating} icon={<Star size={18} color="var(--warning)" />} iconBg="rgba(210,153,34,.15)" />
        <StatCard label="Số thể loại" value={categories.length} icon={<Tag size={18} color="var(--warning)" />} iconBg="rgba(210,153,34,.15)" />
      </div>

      {/* Biểu đồ */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title"><Eye size={15} /> Top sách theo lượt xem (30 ngày)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topViews} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Lượt xem" fill="var(--accent-dim)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title"><Star size={15} /> Top sách theo đánh giá</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topRated} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Đánh giá" fill="var(--warning)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title"><Heart size={15} /> Top sách theo yêu thích</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topFavs} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Yêu thích" fill="var(--danger)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title"><Tag size={15} /> Phân bố thể loại sách</div>
          {catPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={catPie}
                  cx="50%"
                  cy="45%"
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
                  wrapperStyle={{ paddingTop: 12, lineHeight: '24px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="loading-center text-muted">Chưa có dữ liệu thể loại</div>
          )}
        </div>
      </div>

      {/* Bảng chi tiết sách */}
      <div className="card">
        <div className="card-title"><BarChart3 size={15} /> Tất cả sách (30 ngày trending, sắp xếp theo lượt xem)</div>
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
                <th>Đánh giá TB</th>
                <th>Số đánh giá</th>
                <th>Số trang</th>
              </tr>
            </thead>
            <tbody>
              {trending30.map((b, i) => (
                <tr key={b.id}>
                  <td className="text-muted text-sm">{i + 1}</td>
                  <td>
                    {b.coverImage
                      ? <img src={resolveMediaUrl(b.coverImage)} alt={b.title} className="book-cover-thumb" />
                      : <div className="book-cover-thumb" style={{ display:'flex',alignItems:'center',justifyContent:'center' }}>📖</div>
                    }
                  </td>
                  <td>
                    <div className="font-semibold truncate" style={{ maxWidth: 200 }}>{b.title}</div>
                    <div className="text-xs text-muted">{b.authors?.join(', ')}</div>
                  </td>
                  <td>{b.category ? <span className="badge badge-blue">{b.category.name}</span> : '—'}</td>
                  <td>{b.totalViews?.toLocaleString()}</td>
                  <td>{b.totalFavorites?.toLocaleString()}</td>
                  <td><span style={{ color: 'var(--warning)' }}>★</span> {b.averageRating?.toFixed(1)}</td>
                  <td>{b.ratingCount}</td>
                  <td>{b.totalPages || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, icon, iconBg }: { label: string; value: string | number; icon: React.ReactNode; iconBg: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon" style={{ background: iconBg }}>{icon}</div>
      </div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
}
