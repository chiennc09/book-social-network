/**
 * Domain Model: Represents a file with all metadata
 * Pure domain model - independent of storage implementation
 */
export interface FileObject {
  id?: string;
  originalName: string;
  contentType: string;
  size: number;
  bucket?: string;
  objectKey?: string;
  publicUrl?: string;
  fileCategory: string;  // 'covers' | 'epubs' | 'pdfs' | 'avatars'
  createdAt?: number;
  updatedAt?: number;
  status?: 'UPLOADING' | 'UPLOADED' | 'DELETED' | 'FAILED';
  ownerId?: string;
}

/**
 * FileUploadRequest - payload for upload API
 */
export interface FileUploadRequest {
  file: File | Blob;
  fileCategory: string;
  onProgress?: (percent: number) => void;
}

/**
 * FileUploadResponse - response from server after upload
 */
export interface FileUploadResponse {
  originalFileName: string;
  url: string;
  fileId: string;
  size: number;
  contentType: string;
  uploadedAt: number;
}

/**
 * FileDownloadRequest - parameters for download
 */
export interface FileDownloadRequest {
  fileId: string;
  fileName?: string;
}
