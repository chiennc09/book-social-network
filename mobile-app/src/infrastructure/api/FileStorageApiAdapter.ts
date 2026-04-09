import { FileDownloadRequest, FileUploadRequest, FileUploadResponse, FileObject } from '../../domain/models/FileObject';
import { FileStoragePort } from '../../domain/ports/FileStoragePort';
import { SERVICE_PATHS } from '../../config/env';
import axiosClient from './axiosClient';

/**
 * Adapter: FileStorageApiAdapter implements FileStoragePort using REST API.
 * All file operations go through the API Gateway → file-service.
 */
export class FileStorageApiAdapter implements FileStoragePort {
  /** File service prefix via Gateway — e.g., http://10.0.2.2:8888/file */
  private readonly fileServiceUrl = SERVICE_PATHS.file;

  /**
   * Upload file to API Gateway → file-service → MinIO
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', request.file as Blob | File);
    formData.append('type', request.fileCategory);

    const response = await axiosClient.post<FileUploadResponse>(
      `${this.fileServiceUrl}/media/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000, // 2 min for large files
        onUploadProgress: (progressEvent) => {
          if (request.onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            request.onProgress(percentCompleted);
          }
        },
      },
    );

    return (response.data as any).result || response.data;
  }

  /**
   * Download file by ID via API Gateway
   */
  async downloadFile(request: FileDownloadRequest): Promise<Blob> {
    const response = await axiosClient.get(
      `${this.fileServiceUrl}/media/download/${request.fileId}`,
      { responseType: 'blob', timeout: 60_000 },
    );
    return response.data as Blob;
  }

  /**
   * Delete file by ID
   */
  async deleteFile(fileId: string): Promise<void> {
    await axiosClient.delete(`${this.fileServiceUrl}/media/${fileId}`);
  }

  /**
   * Get file metadata by ID
   */
  async getFileMetadata(fileId: string): Promise<FileObject> {
    const response = await axiosClient.get<FileObject>(
      `${this.fileServiceUrl}/media/${fileId}`,
    );
    return (response.data as any).result || response.data;
  }
}
