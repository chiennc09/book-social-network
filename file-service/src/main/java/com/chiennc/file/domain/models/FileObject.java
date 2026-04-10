package com.chiennc.file.domain.models;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Domain Model: FileObject represents a file stored in object storage.
 * This is a pure domain concept, independent of implementation details (local disk, S3, MinIO, etc.)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileObject {
    
    // Identity
    String id;
    
    // File metadata
    String originalName;
    String contentType;
    long size;
    String md5Checksum;
    
    // Storage location (logical, not physical path)
    String bucket;
    String objectKey;
    
    // Ownership and audit
    String ownerId;
    String fileCategory;  // covers, epubs, pdfs, avatars, etc.
    
    // Access information
    String publicUrl;  // Public accessible URL
    
    // Timestamps
    long createdAt;
    long updatedAt;
    
    // Status
    FileStatus status;
    
    public enum FileStatus {
        UPLOADING,
        UPLOADED,
        DELETED,
        FAILED
    }
}
