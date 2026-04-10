import { FileDownloadRequest, FileUploadResponse, FileObject } from '../../domain/models/FileObject';
import { FileStoragePort } from '../../domain/ports/FileStoragePort';
import { SERVICE_PATHS } from '../../config/env';
import axiosClient from './axiosClient';

/**
 * React Native file descriptor — returned by react-native-image-picker,
 * react-native-document-picker, or manually constructed.
 *
 * In React Native, the FormData API differs from Web:
 *   Web: formData.append('file', blobOrFile)
 *   RN:  formData.append('file', { uri, name, type })
 *
 * Spring expects the multipart part name 'file' and the type sent
 * as a separate field called 'type'.
 */
export interface RNFileDescriptor {
  /** content:// or file:// URI from the device */
  uri: string;
  /** Original filename including extension  */
  name: string;
  /** MIME type, e.g. 'image/jpeg' */
  type: string;
}

/**
 * FileStorageApiAdapter implements FileStoragePort using REST API.
 * All file operations go through the API Gateway → file-service.
 */
export class FileStorageApiAdapter {
  private readonly fileServiceUrl = SERVICE_PATHS.file;

  /**
   * Upload a file through the API Gateway to MinIO.
   *
   * @param fileDescriptor  React Native file descriptor {uri, name, type}
   * @param category        Folder category: 'avatars' | 'covers' | 'epubs' | 'pdfs' | 'others'
   * @param onProgress      Optional upload progress callback (0–100)
   */
  async uploadFile(
    fileDescriptor: RNFileDescriptor,
    category: string = 'others',
    onProgress?: (percent: number) => void,
  ): Promise<FileUploadResponse> {
    /**
     * IMPORTANT — React Native FormData format:
     * Do NOT cast to Blob. Pass the file descriptor object directly.
     * React Native's XHR layer reads the uri and streams the file.
     */
    const formData = new FormData();
    formData.append('file', fileDescriptor as any);
    formData.append('type', category);

    const response = await axiosClient.post<any>(
      `${this.fileServiceUrl}/media/upload`,
      formData,
      {
        headers: {
          // Let React Native XHR set Content-Type with correct boundary automatically.
          // Setting it manually (even as 'multipart/form-data') strips the boundary!
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120_000, // 2 min for large files
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onProgress(percent);
          }
        },
      },
    );

    // Spring wraps response in ApiResponse<FileResponse> → { code, result }
    return (response.data as any).result ?? response.data;
  }

  /**
   * Download a file by its ID via the API Gateway.
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await axiosClient.get(
      `${this.fileServiceUrl}/media/download/${fileId}`,
      { responseType: 'blob', timeout: 60_000 },
    );
    return response.data as Blob;
  }

  /**
   * Delete a file by its ID.
   */
  async deleteFile(fileId: string): Promise<void> {
    await axiosClient.delete(`${this.fileServiceUrl}/media/${fileId}`);
  }

  /**
   * Get file metadata (URL, name, size) by its ID.
   */
  async getFileMetadata(fileId: string): Promise<FileObject> {
    const response = await axiosClient.get<FileObject>(
      `${this.fileServiceUrl}/media/${fileId}`,
    );
    return (response.data as any).result ?? response.data;
  }
}

/** Singleton — use this exported instance everywhere in the app */
export const fileStorageAdapter = new FileStorageApiAdapter();
