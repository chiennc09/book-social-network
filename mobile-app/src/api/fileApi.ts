import { FileStorageApiAdapter } from '../infrastructure/api/FileStorageApiAdapter';

/**
 * Public API for file operations
 * Implements the Facade pattern to provide a clean interface
 * Internally uses FileStorageApiAdapter which implements FileStoragePort
 */
class FileApi {
  private adapter: FileStorageApiAdapter;

  constructor() {
    this.adapter = new FileStorageApiAdapter();
  }

  /**
   * Upload file with progress tracking
   * @param file File to upload
   * @param type File category (covers, epubs, pdfs, avatars, others)
   * @param onProgress Progress callback (0-100%)
   */
  upload(
    file: File | Blob,
    type: string = 'others',
    onProgress?: (percent: number) => void
  ) {
    return this.adapter
      .uploadFile({
        file,
        fileCategory: type,
        onProgress,
      })
      .toPromise?.() || this.adapter.uploadFile({
        file,
        fileCategory: type,
        onProgress,
      });
  }

  /**
   * Download file by ID
   * @param fileId File ID to download
   */
  downloadFile(fileId: string) {
    return this.adapter
      .downloadFile({ fileId })
      .toPromise?.() || this.adapter.downloadFile({ fileId });
  }

  /**
   * Delete file by ID
   * @param fileId File ID to delete
   */
  deleteFile(fileId: string) {
    return this.adapter
      .deleteFile(fileId)
      .toPromise?.() || this.adapter.deleteFile(fileId);
  }

  /**
   * Get file metadata
   * @param fileId File ID
   */
  getMetadata(fileId: string) {
    return this.adapter
      .getFileMetadata(fileId)
      .toPromise?.() || this.adapter.getFileMetadata(fileId);
  }
}

// Export singleton instance for global use
export const fileApi = new FileApi();
