import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Plus, Pencil, Trash2, Search, Shield } from 'lucide-react';
import { userApi, type User, type CreateUserRequest, type UpdateUserRequest } from '../api/userApi';
import ConfirmModal from '../components/ConfirmModal';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
  });

  const createMut = useMutation({
    mutationFn: (r: CreateUserRequest) => userApi.create(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: () => setError('Failed to create user.'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, r }: { id: string; r: UpdateUserRequest }) => userApi.update(id, r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: () => setError('Failed to update user.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => userApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const filtered = users.filter(
    (u) => u.username?.toLowerCase().includes(search.toLowerCase())
      || u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => { setForm({}); setError(''); setModal('create'); };
  const openEdit = (u: User) => {
    setSelected(u);
    setForm({ firstName: '', lastName: '', roles: u.roles?.map((r) => r.name).join(',') || '' });
    setError(''); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setForm({}); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal === 'create') {
      createMut.mutate({
        username: form.username || '',
        password: form.password || '',
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
      });
    } else if (modal === 'edit' && selected) {
      updateMut.mutate({
        id: selected.id,
        r: {
          password: form.password || undefined,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          roles: form.roles ? form.roles.split(',').map((r) => r.trim()).filter(Boolean) : undefined,
        },
      });
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Users size={22} color="var(--accent)" /> Users</h1>
          <p className="page-subtitle">Manage user accounts and roles</p>
        </div>
        <button id="users-create-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="search-bar">
          <Search size={14} />
          <input
            id="users-search"
            className="form-input"
            placeholder="Search by username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Roles</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={4}><div className="loading-center"><div className="spinner" /></div></td></tr>
            )}
            {!isLoading && filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold">{u.username}</span>
                  </div>
                </td>
                <td className="text-muted text-sm">{u.email || '—'}</td>
                <td>
                  {u.roles?.map((r) => (
                    <span key={r.name} className="badge badge-blue" style={{ marginRight: 4 }}>
                      <Shield size={10} /> {r.name}
                    </span>
                  ))}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      id={`users-edit-${u.id}`}
                      className="btn btn-ghost btn-sm btn-icon"
                      title="Edit"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      id={`users-delete-${u.id}`}
                      className="btn btn-danger btn-sm btn-icon"
                      title="Delete"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'create' ? 'New User' : `Edit: ${selected?.username}`}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal} id="user-modal-close">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}
                {modal === 'create' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Username *</label>
                      <input id="user-form-username" className="form-input" required value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input id="user-form-email" className="form-input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Password {modal === 'edit' && '(leave blank to keep)'}</label>
                  <input id="user-form-password" className="form-input" type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required={modal === 'create'} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input id="user-form-firstname" className="form-input" value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input id="user-form-lastname" className="form-input" value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>
                {modal === 'edit' && (
                  <div className="form-group">
                    <label className="form-label">Roles (comma-separated)</label>
                    <input id="user-form-roles" className="form-input" placeholder="USER,ADMIN" value={form.roles || ''} onChange={(e) => setForm({ ...form, roles: e.target.value })} />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button id="user-form-submit" type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete User"
          message={`Delete user "${deleteTarget.username}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
