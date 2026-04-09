package com.chiennc.file.entity;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.MongoId;

@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "file_mgmt")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileMgmt {
    @MongoId
    String id;  // UUID
    
    // Ownership
    String ownerId;
    
    // File metadata
    String originalName;
    String contentType;
    long size;
    String md5Checksum;
    
    // Storage location (MinIO)
    String bucket;
    String objectKey;  // S3-style key: category/uuid_filename
    
    // File categorization
    String fileCategory;  // covers, epubs, pdfs, avatars, etc.
    
    // Access
    String publicUrl;
    
    // Status
    String status;  // UPLOADING, UPLOADED, DELETED, FAILED
    
    // Timestamps
    long createdAt;
    long updatedAt;
}

