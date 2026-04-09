import { FileObject, FileUploadRequest, FileUploadResponse } from '../models/FileObject';
import { FileStoragePort } from '../ports/FileStoragePort';

/**
 * Domain Service: FileObjectService
 * Encapsulates domain logic for file operations
 * Uses FileStoragePort to abstract storage mechanism
 */
export class FileObjectService {
  constructor(private fileStoragePort: FileStoragePort) {}

  /**
   * Upload file with domain validation
   */
  uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    // Domain validation
    this.validateFileUpload(request);

    // Use port to upload
    return this.fileStoragePort.uploadFile(request);
  }

  /**
   * Download file by ID
   */
  downloadFile(fileId: string): Promise<Blob> {
    if (!fileId?.trim()) {
      throw new Error('File ID is required');
    }

    return this.fileStoragePort.downloadFile({ fileId });
  }

  /**
   * Delete file by ID
   */
  deleteFile(fileId: string): Promise<void> {
    if (!fileId?.trim()) {
      throw new Error('File ID is required');
    }

    return this.fileStoragePort.deleteFile(fileId);
  }

  /**
   * Domain validation for file uploads
   */
  private validateFileUpload(request: FileUploadRequest): void {
    if (!request.file) {
      throw new Error('File is required');
    }

    if (!request.fileCategory?.trim()) {
      throw new Error('File category is required');
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (request.file.size > maxSize) {
      throw new Error('File size exceeds maximum limit of 100MB');
    }

    // Validate file category
    const validCategories = ['covers', 'epubs', 'pdfs', 'avatars', 'others'];
    if (!validCategories.includes(request.fileCategory)) {
      throw new Error(`Invalid file category. Must be one of: ${validCategories.join(', ')}`);
    }
  }
}
