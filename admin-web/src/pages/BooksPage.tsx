import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Pencil, Trash2, Search, Upload, Eye, Star, Heart } from 'lucide-react';
import { bookApi, type Book, type BookRequest } from '../api/bookApi';
import { fileApi } from '../api/fileApi';
import { resolveMediaUrl } from '../config/env';
import ConfirmModal from '../components/ConfirmModal';

export default function BooksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [form, setForm] = useState<Partial<BookRequest & { authorsStr: string }>>({});
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const coverRef = useRef<HTMLInputElement>(null);
  const pdfRef   = useRef<HTMLInputElement>(null);
  const epubRef  = useRef<HTMLInputElement>(null);
  const [uploadedKeys, setUploadedKeys] = useState<{ coverUrl?: string; pdfUrl?: string; epubUrl?: string }>({});

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books-search', search],
    queryFn: () => search.trim().length >= 2 ? bookApi.search(search) : bookApi.getTrending(365, 50),
    staleTime: 30_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => bookApi.getAllCategories(),
  });

  const createMut = useMutation({
    mutationFn: async (r: BookRequest) => {
      const book = await bookApi.create(r);
      if (Object.keys(uploadedKeys).length > 0) {
        await bookApi.uploadFiles(book.id, uploadedKeys);
      }
      return book;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books-search'] }); closeModal(); },
    onError: () => setError('Failed to save book.'),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, r }: { id: string; r: BookRequest }) => {
      const book = await bookApi.update(id, r);
      if (Object.keys(uploadedKeys).length > 0) {
        await bookApi.uploadFiles(id, uploadedKeys);
      }
      return book;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books-search'] }); closeModal(); },
    onError: () => setError('Failed to update book.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bookApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books-search'] }),
  });

  const openCreate = () => { setForm({ authorsStr: '' }); setUploadedKeys({}); setCoverPreview(''); setError(''); setModal('create'); };
  const openEdit = (b: Book) => {
    setSelected(b);
    setForm({
      title: b.title, authorsStr: b.authors?.join(', ') || '',
      description: b.description, categoryId: b.categoryId,
      isPublic: b.isPublic, totalPages: b.totalPages,
    });
    setCoverPreview(b.coverImage ? resolveMediaUrl(b.coverImage) : '');
    setUploadedKeys({});
    setError(''); setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setForm({}); setUploadedKeys({}); setCoverPreview(''); setError(''); };

  const handleFileUpload = async (file: File, type: 'covers' | 'pdfs' | 'epubs') => {
    setUploading(true);
    try {
      const res = await fileApi.upload(file, type);
      setUploadedKeys((prev) => ({
        ...prev,
        ...(type === 'covers' ? { coverUrl: res.url } : {}),
        ...(type === 'pdfs'   ? { pdfUrl: res.url }   : {}),
        ...(type === 'epubs'  ? { epubUrl: res.url }  : {}),
      }));
      if (type === 'covers') setCoverPreview(resolveMediaUrl(res.url));
    } catch { setError('Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const req: BookRequest = {
      title: form.title || '',
      authors: (form.authorsStr || '').split(',').map((a) => a.trim()).filter(Boolean),
      description: form.description,
      categoryId: form.categoryId,
      isPublic: form.isPublic ?? true,
      totalPages: form.totalPages,
    };
    if (modal === 'create') createMut.mutate(req);
    else if (modal === 'edit' && selected) updateMut.mutate({ id: selected.id, r: req });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title"><BookOpen size={22} color="var(--accent)" /> Books</h1>
          <p className="page-subtitle">Manage book catalog</p>
        </div>
        <button id="books-create-btn" className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New Book
        </button>
      </div>

      {/* Search bar */}
      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div className="search-bar">
          <Search size={14} />
          <input
            id="books-search"
            className="form-input"
            placeholder="Search books (min 2 chars)…"
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
              <th style={{ width: 48 }}>Cover</th>
              <th>Title / Authors</th>
              <th>Category</th>
              <th><Eye size={12} /> Views</th>
              <th><Heart size={12} /> Favs</th>
              <th><Star size={12} /> Avg</th>
              <th>Public</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8}><div className="loading-center"><div className="spinner" /></div></td></tr>
            )}
            {!isLoading && books.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.coverImage
                    ? <img src={resolveMediaUrl(b.coverImage)} alt={b.title} className="book-cover-thumb" />
                    : <div className="book-cover-thumb" style={{ display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>📖</div>
                  }
                </td>
                <td>
                  <div className="font-semibold truncate" style={{ maxWidth: 240 }}>{b.title}</div>
                  <div className="text-xs text-muted">{b.authors?.join(', ')}</div>
                </td>
                <td>
                  {b.category
                    ? <span className="badge badge-blue">{b.category.name}</span>
                    : <span className="text-muted text-xs">—</span>
                  }
                </td>
                <td>{b.totalViews?.toLocaleString()}</td>
                <td>{b.totalFavorites?.toLocaleString()}</td>
                <td>
                  <span style={{ color: 'var(--warning)' }}>★</span> {b.averageRating?.toFixed(1)}
                </td>
                <td>
                  <span className={`badge ${b.isPublic ? 'badge-green' : 'badge-gray'}`}>
                    {b.isPublic ? 'Public' : 'Private'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button id={`books-edit-${b.id}`} className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(b)} title="Edit"><Pencil size={13} /></button>
                    <button id={`books-delete-${b.id}`} className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteTarget(b)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && books.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No books found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'create' ? 'New Book' : `Edit: ${selected?.title}`}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {error && <div className="alert alert-error">{error}</div>}

                {/* Cover preview & upload */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    {coverPreview
                      ? <img src={coverPreview} alt="cover" style={{ width: 80, height: 112, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                      : <div style={{ width: 80, height: 112, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>📖</div>
                    }
                    <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} id="book-cover-input"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'covers')} />
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: 80 }}
                      onClick={() => coverRef.current?.click()} disabled={uploading} id="book-cover-btn">
                      <Upload size={12} /> Cover
                    </button>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Title *</label>
                      <input id="book-form-title" className="form-input" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Authors (comma-separated) *</label>
                      <input id="book-form-authors" className="form-input" required value={form.authorsStr || ''} onChange={(e) => setForm({ ...form, authorsStr: e.target.value })} placeholder="Author 1, Author 2" />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea id="book-form-desc" className="form-textarea" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select id="book-form-category" className="form-select" value={form.categoryId || ''} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                      <option value="">— None —</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Pages</label>
                    <input id="book-form-pages" className="form-input" type="number" min={0} value={form.totalPages || ''} onChange={(e) => setForm({ ...form, totalPages: +e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select id="book-form-public" className="form-select" value={form.isPublic ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isPublic: e.target.value === 'true' })}>
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                </div>

                {/* File uploads */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">PDF File</label>
                    <input ref={pdfRef} type="file" accept=".pdf" style={{ display: 'none' }} id="book-pdf-input"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'pdfs')} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => pdfRef.current?.click()} disabled={uploading} id="book-pdf-btn">
                      <Upload size={12} /> {uploadedKeys.pdfUrl ? '✓ Uploaded' : 'Upload PDF'}
                    </button>
                  </div>
                  <div className="form-group">
                    <label className="form-label">EPUB File</label>
                    <input ref={epubRef} type="file" accept=".epub" style={{ display: 'none' }} id="book-epub-input"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'epubs')} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => epubRef.current?.click()} disabled={uploading} id="book-epub-btn">
                      <Upload size={12} /> {uploadedKeys.epubUrl ? '✓ Uploaded' : 'Upload EPUB'}
                    </button>
                  </div>
                </div>

                {uploading && <div className="alert alert-info"><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button id="book-form-submit" type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending || uploading}>
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Book"
          message={`Delete "${deleteTarget.title}"? This will also remove it from Qdrant.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
