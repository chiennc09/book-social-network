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
 *
 * NOTE: In React Native, files are NOT Web File/Blob objects.
 * Use the RNFileDescriptor format from FileStorageApiAdapter.
 * This interface is kept for legacy compatibility only.
 *
 * @deprecated Use RNFileDescriptor from FileStorageApiAdapter directly.
 */
export interface FileUploadRequest {
  /** React Native file URI (content:// or file://) or Web File/Blob */
  file: { uri: string; name: string; type: string } | File | Blob;
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
