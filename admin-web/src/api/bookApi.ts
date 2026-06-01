import api from './client';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Book {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  categoryId?: string;
  category?: Category;
  coverImage?: string;
  pdfPath?: string;
  epubPath?: string;
  isPublic?: boolean;
  ownerId?: string;
  totalViews: number;
  totalPages?: number;
  averageRating: number;
  ratingCount: number;
  totalFavorites: number;
}

export interface BookRequest {
  title: string;
  authors: string[];
  description?: string;
  categoryId?: string;
  isPublic?: boolean;
  totalPages?: number;
}

export const bookApi = {
  // ── Book CRUD ────────────────────────────────────────────────────────────────

  getById: async (id: string): Promise<Book> => {
    const res = await api.get(`/books/${id}`);
    return res.data.result;
  },

  search: async (q: string): Promise<Book[]> => {
    const res = await api.get('/books/search', { params: { q } });
    return res.data.result ?? [];
  },

  getTrending: async (days = 7, limit = 20): Promise<Book[]> => {
    const res = await api.get('/books/trending', { params: { days, limit } });
    return res.data.result ?? [];
  },

  getByCategory: async (categoryId: string): Promise<Book[]> => {
    const res = await api.get(`/books/category/${categoryId}`);
    return res.data.result ?? [];
  },

  create: async (req: BookRequest): Promise<Book> => {
    const res = await api.post('/books/create', req);
    return res.data.result;
  },

  update: async (id: string, req: BookRequest): Promise<Book> => {
    const res = await api.put(`/books/${id}`, req);
    return res.data.result;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/books/${id}`);
  },

  uploadFiles: async (
    id: string,
    params: { coverUrl?: string; pdfUrl?: string; epubUrl?: string },
  ): Promise<Book> => {
    const res = await api.post(`/books/${id}/upload`, null, { params });
    return res.data.result;
  },

  syncQdrant: async (): Promise<void> => {
    await api.post('/books/sync-qdrant');
  },

  // ── Category CRUD ────────────────────────────────────────────────────────────

  getAllCategories: async (): Promise<Category[]> => {
    const res = await api.get('/books/categories');
    return res.data.result ?? [];
  },

  createCategory: async (data: { name: string; description?: string }): Promise<Category> => {
    const res = await api.post('/books/categories', data);
    return res.data.result;
  },

  updateCategory: async (id: string, data: { name: string; description?: string }): Promise<Category> => {
    const res = await api.put(`/books/categories/${id}`, data);
    return res.data.result;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/books/categories/${id}`);
  },

  // ── Reviews ──────────────────────────────────────────────────────────────────

  getReviews: async (bookId: string) => {
    const res = await api.get(`/books/${bookId}/reviews`);
    return res.data.result ?? [];
  },
};
