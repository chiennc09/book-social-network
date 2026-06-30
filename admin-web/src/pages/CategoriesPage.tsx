import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import { bookApi, type Category } from '../api/bookApi';
import ConfirmModal from '../components/ConfirmModal';

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [form, setForm] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [error, setError] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => bookApi.getAllCategories(),
  });

  const createMut = useMutation({
    mutationFn: (d: { name: string; description?: string }) => bookApi.createCategory(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); closeModal(); },
    onError: () => setError('Không thể tạo thể loại.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: { name: string; description?: string } }) => bookApi.updateCategory(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); closeModal(); },
    onError: () => setError('Không thể cập nhật thể loại.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bookApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const openCreate = () => { setForm({ name: '', description: '' }); setError(''); setModal('create'); };
  const openEdit = (c: Category) => {
    setSelected(c);
    setForm({ name: c.name, description: c.description || '' });
    setError(''); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setForm({ name: '', description: '' }); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = { name: form.name, description: form.description || undefined };
    if (modal === 'create') createMut.mutate(d);
    else if (modal === 'edit' && selected) updateMut.mutate({ id: selected.id, d });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Tag size={22} color="var(--accent)" /> Thể loại</h1>
          <p className="page-subtitle">Quản lý thể loại và danh mục sách</p>
        </div>
        <button id="categories-create-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Thêm thể loại
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tên thể loại</th>
              <th>Mô tả</th>
              <th style={{ width: 120 }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={3}><div className="loading-center"><div className="spinner" /></div></td></tr>
            )}
            {!isLoading && categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="badge badge-blue"><Tag size={10} /> {c.name}</span>
                </td>
                <td className="text-sm text-muted">{c.description || '—'}</td>
                <td>
                  <div className="flex gap-2">
                    <button id={`cat-edit-${c.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(c)} title="Chỉnh sửa"><Pencil size={13} /></button>
                    <button id={`cat-delete-${c.id}`} className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteTarget(c)} title="Xóa"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && categories.length === 0 && (
              <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Chưa có thể loại nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'create' ? 'Thêm thể loại mới' : `Chỉnh sửa: ${selected?.name}`}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Tên thể loại *</label>
                  <input id="cat-form-name" className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Khoa học viễn tưởng" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea id="cat-form-desc" className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả tùy chọn…" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Hủy</button>
                <button id="cat-form-submit" type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Xóa thể loại"
          message={`Xóa thể loại "${deleteTarget.name}"?`}
          confirmLabel="Xóa"
          danger
          onConfirm={() => { deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
