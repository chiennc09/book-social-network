import { FileStorageApiAdapter, RNFileDescriptor } from '../infrastructure/api/FileStorageApiAdapter';

/**
 * fileApi — Facade over FileStorageApiAdapter.
 *
 * Usage (from any screen):
 *
 *   import { fileApi } from '../api/fileApi';
 *
 *   // From image picker result:
 *   const asset = result.assets[0];
 *   const uploaded = await fileApi.uploadFromImagePicker(asset, 'avatars');
 *   const url = uploaded.url;
 *
 *   // From document picker result:
 *   const doc = result[0];
 *   const uploaded = await fileApi.uploadFromDocumentPicker(doc, 'epubs');
 */
class FileApi {
  private adapter = new FileStorageApiAdapter();

  /**
   * Upload a file selected from the device photo/image library.
   *
   * @param asset       Asset from react-native-image-picker (result.assets[0])
   * @param category    Storage category: 'avatars' | 'covers' | 'others'
   * @param onProgress  Optional upload progress callback (0–100)
   */
  async uploadFromImagePicker(
    asset: {
      uri?: string;
      fileName?: string | null;
      type?: string | null;
      fileSize?: number;
    },
    category: string = 'others',
    onProgress?: (percent: number) => void,
  ) {
    if (!asset.uri) throw new Error('Image asset has no URI');

    const descriptor: RNFileDescriptor = {
      uri: asset.uri,
      name: asset.fileName || `upload_${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
    };

    return this.adapter.uploadFile(descriptor, category, onProgress);
  }

  /**
   * Upload a file selected from the document picker.
   *
   * @param doc         Document from react-native-document-picker (result[0])
   * @param category    Storage category: 'epubs' | 'pdfs' | 'others'
   * @param onProgress  Optional upload progress callback (0–100)
   */
  async uploadFromDocumentPicker(
    doc: {
      uri: string;
      name?: string | null;
      type?: string | null;
    },
    category: string = 'others',
    onProgress?: (percent: number) => void,
  ) {
    const descriptor: RNFileDescriptor = {
      uri: doc.uri,
      name: doc.name || `upload_${Date.now()}`,
      type: doc.type || 'application/octet-stream',
    };

    return this.adapter.uploadFile(descriptor, category, onProgress);
  }

  /**
   * Upload using a raw file descriptor (uri + name + type).
   * Use this when you already have the file info constructed.
   */
  async upload(
    descriptor: RNFileDescriptor,
    category: string = 'others',
    onProgress?: (percent: number) => void,
  ) {
    return this.adapter.uploadFile(descriptor, category, onProgress);
  }

  /** Download file by ID */
  downloadFile(fileId: string) {
    return this.adapter.downloadFile(fileId);
  }

  /** Delete file by ID */
  deleteFile(fileId: string) {
    return this.adapter.deleteFile(fileId);
  }

  /** Get file metadata by ID */
  getMetadata(fileId: string) {
    return this.adapter.getFileMetadata(fileId);
  }
}

export const fileApi = new FileApi();
