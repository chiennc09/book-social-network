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
    onError: (e: any) => setResult({ status: 'error', message: e?.response?.data?.message || 'Error occurred' }),
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
          <span>Done! {action.result.message && <code style={{ fontSize: 11 }}>{action.result.message}</code>}</span>
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
            ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Running…</>
            : <>{btnLabel}</>
          }
        </button>
        {action.result.status !== 'idle' && (
          <button className="btn btn-ghost btn-sm" onClick={action.reset}>Reset</button>
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
          <h1 className="page-title"><Brain size={22} color="var(--accent)" /> Recommendations</h1>
          <p className="page-subtitle">Manage AI recommendation engine and vector search</p>
        </div>
      </div>

      {/* Info box */}
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <Brain size={14} />
        <span>
          The recommendation engine uses <b>ALS collaborative filtering</b> + <b>content-based filtering (CBF)</b>
          with <b>Qdrant</b> for vector search. Training runs asynchronously — check service logs for progress.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        <ActionCard
          id="rec-trigger-training"
          icon={<Zap size={18} color="var(--accent)" />}
          title="Trigger ALS Training"
          description="Re-train the Alternating Least Squares (ALS) collaborative filtering model using all user behavior data in MongoDB. Runs in background — does not block."
          btnLabel="Start Training"
          action={trainAction}
        />

        <ActionCard
          id="rec-flush-cache"
          icon={<RefreshCw size={18} color="var(--warning)" />}
          title="Flush Recommendation Cache"
          description="Clear all cached recommendations from Redis (rec:*, today_rec:*, recent_views:*). Users will rebuild fresh recs on next request. Use after DB resets or major changes."
          btnLabel="Flush Cache"
          btnClass="btn-success"
          action={flushAction}
        />

        <ActionCard
          id="rec-purge-qdrant"
          icon={<Trash2 size={18} color="var(--danger)" />}
          title="Purge Qdrant Orphans"
          description="Scan Qdrant collection and remove vectors whose bookId no longer exists in MongoDB. Run after bulk deletions or data migrations. Runs as background job."
          btnLabel="Purge Orphans"
          btnClass="btn-danger"
          action={orphanAction}
        />

        <ActionCard
          id="rec-sync-qdrant"
          icon={<Database size={18} color="var(--info)" />}
          title="Sync Books → Qdrant"
          description="Fire BOOK_UPDATED Kafka events for all books to rebuild their vector embeddings in Qdrant. Use after a fresh install or embedding model change."
          btnLabel="Sync All Books"
          btnClass="btn-ghost"
          action={syncQdrantAction}
        />
      </div>

      {/* Architecture reference */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">System Architecture</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p><b style={{ color: 'var(--accent)' }}>ALS Collaborative Filtering</b> — long-term recommendations based on user-item interaction matrix. Trained periodically via the training job above. Results cached in Redis (<code>rec:&#123;userId&#125;</code>).</p>
          <p style={{ marginTop: 8 }}><b style={{ color: 'var(--accent)' }}>Content-Based Filtering (CBF)</b> — finds similar books using semantic embeddings in Qdrant. Runs for cold-start users and "Today's Picks". Uses recent view history from Redis (<code>recent_views:&#123;userId&#125;</code>).</p>
          <p style={{ marginTop: 8 }}><b style={{ color: 'var(--accent)' }}>Hybrid</b> — ALS recs are supplemented by CBF when ALS data is sparse. Falls back to global trending if both are empty.</p>
        </div>
      </div>
    </>
  );
}
