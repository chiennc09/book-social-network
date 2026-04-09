package com.chiennc.file.domain.ports;

import com.chiennc.file.domain.models.FileObject;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/**
 * Port: ObjectStoragePort defines the contract for object storage operations.
 * Implementations can be MinIO, AWS S3, Azure Blob, Google Cloud Storage, local disk, etc.
 * This follows the Hexagonal Architecture (Ports & Adapters) pattern.
 */
public interface ObjectStoragePort {
    
    /**
     * Upload a file to object storage
     * @param file MultipartFile to upload
     * @param fileObject FileObject domain model with metadata
     * @return FileObject with storage details populated
     */
    FileObject uploadFile(MultipartFile file, FileObject fileObject);
    
    /**
     * Download a file from object storage
     * @param objectKey unique key of the file in storage
     * @return Resource that can be streamed to client
     */
    Resource downloadFile(String objectKey);
    
    /**
     * Delete a file from object storage
     * @param objectKey unique key of the file in storage
     */
    void deleteFile(String objectKey);
    
    /**
     * Check if a file exists in storage
     * @param objectKey unique key of the file in storage
     * @return true if file exists, false otherwise
     */
    boolean fileExists(String objectKey);
    
    /**
     * Get File metadata from storage
     * @param objectKey unique key of the file in storage
     * @return FileObject with storage metadata
     */
    FileObject getFileMetadata(String objectKey);
    
    /**
     * Generate a public URL for accessing the file
     * @param objectKey unique key of the file in storage
     * @param expirationHours hours until URL expires (0 = never)
     * @return public accessible URL
     */
    String generatePublicUrl(String objectKey, int expirationHours);
}
