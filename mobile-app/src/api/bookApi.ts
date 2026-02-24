// src/api/bookApi.ts
import bookAxiosClient from './bookAxiosClient';

export enum ReadStatus {
  READING = 'READING',
  READ = 'READ',
  WANT_TO_READ = 'WANT_TO_READ'
}

export const bookApi = {
  create: (data: any) => bookAxiosClient.post('/create', data),
  
  update: (id: string, data: any) => bookAxiosClient.put(`/${id}`, data),
  
  delete: (id: string) => bookAxiosClient.delete(`/${id}`),
  
  search: (q: string) => bookAxiosClient.get('/search', { params: { q } }),
  
  upload: (id: string, formData: FormData) => 
    bookAxiosClient.post(`/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Đọc sách: trả về thông tin sách + link (epubPath, pdfPath) + tiến trình
  readBook: (id: string) => bookAxiosClient.get(`/${id}/read`),

  // Cập nhật tiến trình đọc
  updateProgress: (id: string, position: string, percent: number) =>
    bookAxiosClient.post(`/${id}/progress`, null, { params: { position, percent } }),

  // Cập nhật trạng thái trên kệ sách
  updateShelf: (id: string, status: ReadStatus) =>
    bookAxiosClient.put(`/${id}/shelf`, null, { params: { status } }),

  // Lấy danh sách sách trên kệ theo trạng thái
  getBookshelf: (status: ReadStatus) =>
    bookAxiosClient.get('/shelf', { params: { status } }),
};
