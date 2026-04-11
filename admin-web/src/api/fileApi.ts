import api from './client';

export const fileApi = {
  /**
   * Upload a file and get back the relative object key.
   * @param file    File to upload
   * @param type    Category: covers | epubs | pdfs | avatars | others
   * @returns       { url: "covers/uuid_name.jpg", fileId: "...", ... }
   */
  upload: async (file: File, type: string) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/file/media/upload?type=${type}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.result as { url: string; fileId: string; originalFileName: string };
  },

  delete: async (fileId: string): Promise<void> => {
    await api.delete(`/file/media/${fileId}`);
  },
};
