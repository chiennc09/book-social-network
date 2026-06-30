import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Brain, RefreshCw, Trash2, Database, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { recommendationApi } from '../api/recommendationApi';
import { bookApi } from '../api/bookApi';

type Status = 'idle' | 'loading' | 'success' | 'error';
type ActionResult = { status: Status; message?: string };

function useAction(fn: () => Promise<any>) {
  const [result, setResult] = useState<ActionResult>({ status: 'idle' });
  const mut = useMutation({
    mutationFn: fn,
    onMutate: () => setResult({ status: 'loading' }),
    onSuccess: (d) => setResult({ status: 'success', message: JSON.stringify(d) }),
    onError: (e: any) => setResult({ status: 'error', message: e?.response?.data?.message || 'Đã xảy ra lỗi' }),
  });
  return { result, trigger: () => mut.mutate(), reset: () => setResult({ status: 'idle' }) };
}

function ActionCard({
  id, icon, title, description, btnLabel, btnClass = 'btn-primary', action,
}: {
  id: string; icon: React.ReactNode; title: string; description: string;
  btnLabel: string; btnClass?: string;
  action: ReturnType<typeof useAction>;
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold" style={{ fontSize: 15 }}>{title}</span>
      </div>
      <p className="text-sm text-muted">{description}</p>

      {action.result.status === 'success' && (
        <div className="alert alert-success flex gap-2">
          <CheckCircle size={14} />
          <span>Hoàn thành! {action.result.message && <code style={{ fontSize: 11 }}>{action.result.message}</code>}</span>
        </div>
      )}
      {action.result.status === 'error' && (
        <div className="alert alert-error flex gap-2">
          <AlertCircle size={14} /> {action.result.message}
        </div>
      )}

      <div className="flex gap-2">
        <button
          id={id}
          className={`btn ${btnClass}`}
          disabled={action.result.status === 'loading'}
          onClick={action.trigger}
        >
          {action.result.status === 'loading'
            ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Đang chạy…</>
            : <>{btnLabel}</>
          }
        </button>
        {action.result.status !== 'idle' && (
          <button className="btn btn-ghost btn-sm" onClick={action.reset}>Đặt lại</button>
        )}
      </div>
    </div>
  );
}

export default function RecommendationPage() {
  const trainAction       = useAction(() => recommendationApi.triggerTraining());
  const flushAction       = useAction(() => recommendationApi.flushCache());
  const orphanAction      = useAction(() => recommendationApi.purgeQdrantOrphans());
  const syncQdrantAction  = useAction(() => bookApi.syncQdrant());

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Brain size={22} color="var(--accent)" /> Gợi ý sách</h1>
          <p className="page-subtitle">Quản lý engine AI gợi ý và tìm kiếm vector</p>
        </div>
      </div>

      {/* Thông tin */}
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Brain size={14} />
        <span>
          Engine gợi ý sử dụng <b>ALS lọc cộng tác</b> + <b>lọc theo nội dung (CBF)</b>
          kết hợp <b>Qdrant</b> cho tìm kiếm vector. Quá trình huấn luyện chạy bất đồng bộ — kiểm tra log service để theo dõi tiến trình.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        <ActionCard
          id="rec-trigger-training"
          icon={<Zap size={18} color="var(--accent)" />}
          title="Huấn luyện ALS"
          description="Huấn luyện lại mô hình ALS (Alternating Least Squares) lọc cộng tác dựa trên toàn bộ dữ liệu hành vi người dùng trong MongoDB. Chạy nền — không chặn hệ thống."
          btnLabel="Bắt đầu huấn luyện"
          action={trainAction}
        />

        <ActionCard
          id="rec-flush-cache"
          icon={<RefreshCw size={18} color="var(--warning)" />}
          title="Xóa cache gợi ý"
          description="Xóa toàn bộ cache gợi ý từ Redis (rec:*, today_rec:*, recent_views:*). Người dùng sẽ nhận gợi ý mới ở lần truy cập tiếp theo. Dùng sau khi reset DB hoặc có thay đổi lớn."
          btnLabel="Xóa cache"
          btnClass="btn-success"
          action={flushAction}
        />

        <ActionCard
          id="rec-purge-qdrant"
          icon={<Trash2 size={18} color="var(--danger)" />}
          title="Dọn dẹp Qdrant"
          description="Quét collection Qdrant và xóa các vector có bookId không còn tồn tại trong MongoDB. Chạy sau khi xóa hàng loạt hoặc di chuyển dữ liệu. Chạy nền."
          btnLabel="Dọn dẹp orphans"
          btnClass="btn-danger"
          action={orphanAction}
        />

        <ActionCard
          id="rec-sync-qdrant"
          icon={<Database size={18} color="var(--info)" />}
          title="Đồng bộ Sách → Qdrant"
          description="Gửi sự kiện BOOK_UPDATED Kafka cho tất cả sách để tái tạo vector embedding trong Qdrant. Dùng sau khi cài mới hoặc thay đổi mô hình embedding."
          btnLabel="Đồng bộ tất cả sách"
          btnClass="btn-ghost"
          action={syncQdrantAction}
        />
      </div>

      {/* Kiến trúc hệ thống */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Kiến trúc hệ thống</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p><b style={{ color: 'var(--accent)' }}>ALS Lọc cộng tác</b> — gợi ý dài hạn dựa trên ma trận tương tác người dùng - sách. Được huấn luyện định kỳ qua tác vụ phía trên. Kết quả cache trong Redis (<code>rec:&#123;userId&#125;</code>).</p>
          <p style={{ marginTop: 8 }}><b style={{ color: 'var(--accent)' }}>Lọc theo nội dung (CBF)</b> — tìm sách tương tự qua embedding ngữ nghĩa trong Qdrant. Chạy cho người dùng mới và "Gợi ý hôm nay". Sử dụng lịch sử xem gần đây từ Redis (<code>recent_views:&#123;userId&#125;</code>).</p>
          <p style={{ marginTop: 8 }}><b style={{ color: 'var(--accent)' }}>Kết hợp</b> — gợi ý ALS được bổ sung bởi CBF khi dữ liệu ALS thưa. Fallback về trending toàn cục nếu cả hai đều trống.</p>
        </div>
      </div>
    </>
  );
}
