package com.chiennc.file.infrastructure.storage;

import com.chiennc.file.domain.models.FileObject;
import com.chiennc.file.domain.ports.ObjectStoragePort;
import com.chiennc.file.exception.AppException;
import com.chiennc.file.exception.ErrorCode;
import com.chiennc.file.infrastructure.config.MinIOConfig.MinIOProperties;
import io.minio.*;
import io.minio.errors.*;
import io.minio.http.Method;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Adapter: MinIOStorageAdapter implements ObjectStoragePort using MinIO
 * This is the infrastructure layer implementation, decoupled from domain
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MinIOStorageAdapter implements ObjectStoragePort {
    
    MinioClient minioClient;
    MinIOProperties minioProperties;
    
    private static final int PRESIGNED_URL_EXPIRATION_HOURS = 24;

    @Override
    public FileObject uploadFile(MultipartFile file, FileObject fileObject) {
        try {
            // Prepare file name
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null) {
                originalFilename = originalFilename.replaceAll("\\s+", "_");
            } else {
                originalFilename = "file";
            }
            
            String objectKey = generateObjectKey(fileObject.getFileCategory(), originalFilename);
            
            // Upload to MinIO
            log.debug("Uploading file to MinIO: {}", objectKey);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );
            
            // Generate public URL
            String publicUrl = generatePublicUrl(objectKey, 0);
            
            // Update FileObject with storage details
            fileObject.setObjectKey(objectKey);
            fileObject.setBucket(minioProperties.getBucketName());
            fileObject.setPublicUrl(publicUrl);
            fileObject.setMd5Checksum(DigestUtils.md5DigestAsHex(file.getInputStream()));
            fileObject.setStatus(FileObject.FileStatus.UPLOADED);
            fileObject.setCreatedAt(System.currentTimeMillis());
            fileObject.setUpdatedAt(System.currentTimeMillis());
            
            log.info("File uploaded successfully: {} (key: {})", originalFilename, objectKey);
            return fileObject;
            
        } catch (IOException | InvalidKeyException | NoSuchAlgorithmException | XmlParserException |
                 InternalException | ErrorResponseException | InsufficientDataException | ServerException | InvalidResponseException e) {
            log.error("Failed to upload file to MinIO", e);
            fileObject.setStatus(FileObject.FileStatus.FAILED);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to upload file: " + e.getMessage());
        }
    }

    @Override
    public Resource downloadFile(String objectKey) {
        try {
            log.debug("Downloading file from MinIO: {}", objectKey);
            
            GetObjectResponse response = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .build()
            );
            
            // Read entire file into memory
            // For large files, consider streaming directly instead
            byte[] data = response.readAllBytes();
            response.close();
            
            return new ByteArrayResource(data);
            
        } catch (ErrorResponseException e) {
            if (e.errorResponse().code().equals("NoSuchKey")) {
                log.warn("File not found in MinIO: {}", objectKey);
                throw new AppException(ErrorCode.FILE_NOT_FOUND);
            }
            log.error("Failed to download file from MinIO", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to download file");
        } catch (IOException | InvalidKeyException | NoSuchAlgorithmException | XmlParserException |
                 InternalException | InsufficientDataException | ServerException | InvalidResponseException e) {
            log.error("Failed to download file from MinIO", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to download file");
        }
    }

    @Override
    public void deleteFile(String objectKey) {
        try {
            log.debug("Deleting file from MinIO: {}", objectKey);
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .build()
            );
            log.info("File deleted successfully: {}", objectKey);
        } catch (ErrorResponseException e) {
            if (e.errorResponse().code().equals("NoSuchKey")) {
                log.warn("File not found in MinIO for deletion: {}", objectKey);
                return; // Already deleted
            }
            log.error("Failed to delete file from MinIO", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to delete file");
        } catch (IOException | InvalidKeyException | NoSuchAlgorithmException | XmlParserException |
                 InternalException | InsufficientDataException | ServerException | InvalidResponseException e) {
            log.error("Failed to delete file from MinIO", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to delete file");
        }
    }

    @Override
    public boolean fileExists(String objectKey) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .build()
            );
            return true;
        } catch (ErrorResponseException e) {
            if (e.errorResponse().code().equals("NoSuchKey")) {
                return false;
            }
            log.error("Error checking file existence", e);
            return false;
        } catch (IOException | InvalidKeyException | NoSuchAlgorithmException | XmlParserException |
                 InternalException | InsufficientDataException | ServerException | InvalidResponseException e) {
            log.error("Error checking file existence", e);
            return false;
        }
    }

    @Override
    public FileObject getFileMetadata(String objectKey) {
        try {
            var stat = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .build()
            );
            
            return FileObject.builder()
                    .objectKey(objectKey)
                    .bucket(minioProperties.getBucketName())
                    .size(stat.size())
                    .contentType(stat.contentType())
                    .updatedAt(stat.lastModified().toInstant().toEpochMilli())
                    .status(FileObject.FileStatus.UPLOADED)
                    .build();
                    
        } catch (ErrorResponseException | IOException | InvalidKeyException | NoSuchAlgorithmException |
                 XmlParserException | InternalException | InsufficientDataException | ServerException | InvalidResponseException e) {
            log.error("Failed to get file metadata", e);
            throw new AppException(ErrorCode.FILE_NOT_FOUND);
        }
    }

    @Override
    public String generatePublicUrl(String objectKey, int expirationHours) {
        try {
            if (expirationHours == 0) {
                // Return permanent URL format (not presigned)
                return minioProperties.getPublicUrl() + "/" + minioProperties.getBucketName() + "/" + objectKey;
            }
            
            // Generate presigned URL valid for specified hours
            log.debug("Generating presigned URL for object: {}", objectKey);
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(minioProperties.getBucketName())
                            .object(objectKey)
                            .expiry(expirationHours, TimeUnit.HOURS)
                            .build()
            );
        } catch (IOException | InvalidKeyException | NoSuchAlgorithmException | XmlParserException | InternalException |
                 InsufficientDataException | ServerException | InvalidResponseException | ErrorResponseException e) {
            log.error("Failed to generate public URL", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Failed to generate public URL: " + e.getMessage());
        }
    }

    /**
     * Generate unique object key in format: category/uuid_originalname
     */
    private String generateObjectKey(String category, String originalFilename) {
        String filename = UUID.randomUUID().toString() + "_" + originalFilename;
        if (StringUtils.hasText(category)) {
            return category + "/" + filename;
        }
        return filename;
    }
}
