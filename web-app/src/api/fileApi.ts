/**
 * Web App File API - Clean interface for file operations
 * Handles file uploads with progress tracking, downloads, and deletions
 */

import axiosClient from './axiosClient';

interface FileUploadResponse {
  originalFileName: string;
  url: string;
  fileId: string;
  size: number;
  contentType: string;
  uploadedAt: number;
}

const getApiUrl = () => {
  return (import.meta.env.VITE_API_URL as string) || 'http://localhost:8888';
};

export const fileApi = {
  /**
   * Upload file with progress tracking
   * @param file File to upload
   * @param fileCategory File category (covers, epubs, pdfs, avatars)
   * @param onProgress Progress callback
   */
  uploadFile: async (
    file: File,
    fileCategory: string = 'others',
    onProgress?: (percent: number) => void
  ): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', fileCategory);

    const response = await axiosClient.post('/file/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    return (response.data as any).result || response.data;
  },

  /**
   * Download file by ID
   * @param fileId File ID
   * @param fileName Optional filename for download
   */
  downloadFile: async (fileId: string, fileName?: string): Promise<Blob> => {
    const response = await axiosClient.get(`/file/media/download/${fileId}`, {
      responseType: 'blob',
    });

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `file-${fileId}`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);

    return response.data;
  },

  /**
   * Delete file by ID
   * @param fileId File ID to delete
   */
  deleteFile: async (fileId: string): Promise<void> => {
    await axiosClient.delete(`/file/media/${fileId}`);
  },

  /**
   * Get file metadata
   * @param fileId File ID
   */
  getMetadata: async (fileId: string) => {
    const response = await axiosClient.get(`/file/media/${fileId}`);
    return (response.data as any).result || response.data;
  },
};
