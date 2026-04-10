import { FileDownloadRequest, FileObject, FileUploadRequest, FileUploadResponse } from '../models/FileObject';

/**
 * Port: FileStoragePort defines the contract for file storage operations
 * Implementation can be MinIO, S3, Azure Blob, etc.
 * Follows Hexagonal Architecture (Ports & Adapters)
 */
export interface FileStoragePort {
  /**
   * Upload file to storage
   */
  uploadFile(request: FileUploadRequest): Promise<FileUploadResponse>;

  /**
   * Download file from storage
   */
  downloadFile(request: FileDownloadRequest): Promise<Blob>;

  /**
   * Delete file from storage
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Get file metadata
   */
  getFileMetadata(fileId: string): Promise<FileObject>;
}
