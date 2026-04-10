package com.chiennc.file.service;

import com.chiennc.file.domain.models.FileObject;
import com.chiennc.file.domain.ports.ObjectStoragePort;
import com.chiennc.file.dto.response.FileResponse;
import com.chiennc.file.exception.AppException;
import com.chiennc.file.exception.ErrorCode;
import com.chiennc.file.entity.FileMgmt;
import com.chiennc.file.mapper.FileMgmtMapper;
import com.chiennc.file.repository.FileMgmtRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Application Service: FileService orchestrates file uploads and downloads
 * It uses ObjectStoragePort (domain boundary) to abstract storage implementation
 */
@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {
    
    ObjectStoragePort objectStoragePort;  // Injected implementation (MinIOStorageAdapter)
    FileMgmtRepository fileMgmtRepository;
    FileMgmtMapper fileMgmtMapper;

    /**
     * Upload a file and persist its metadata
     * @param file MultipartFile to upload
     * @param fileCategory File category (covers, epubs, pdfs, avatars, etc.)
     * @return FileResponse with download URL
     */
    public FileResponse uploadFile(MultipartFile file, String fileCategory) {
        log.info("Uploading file: {} (category: {})", file.getOriginalFilename(), fileCategory);
        
        try {
            // Create domain model
            FileObject fileObject = FileObject.builder()
                    .originalName(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .fileCategory(fileCategory)
                    .ownerId(getUserIdByToken())
                    .status(FileObject.FileStatus.UPLOADING)
                    .build();

            // Upload to object storage (MinIO)
            fileObject = objectStoragePort.uploadFile(file, fileObject);

            // Persist metadata to MongoDB
            FileMgmt fileMgmt = fileMgmtMapper.fileObjectToFileMgmt(fileObject);
            fileMgmt = fileMgmtRepository.save(fileMgmt);

            log.info("File uploaded successfully: {}", fileObject.getObjectKey());
            
            return FileResponse.builder()
                    .fileId(fileMgmt.getId())
                    .originalFileName(file.getOriginalFilename())
                    .url(fileObject.getPublicUrl())
                    .size(file.getSize())
                    .contentType(file.getContentType())
                    .uploadedAt(System.currentTimeMillis())
                    .build();
                    
        } catch (Exception e) {
            log.error("Failed to upload file", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "File upload failed: " + e.getMessage());
        }
    }

    /**
     * Download a file by its ID
     * @param fileId File ID (maps to MongoDB document ID)
     * @return Resource that can be streamed to client
     */
    public FileDownloadData download(String fileId) {
        log.debug("Downloading file: {}", fileId);
        
        // Get file metadata from MongoDB
        FileMgmt fileMgmt = fileMgmtRepository.findById(fileId)
                .orElseThrow(() -> new AppException(ErrorCode.FILE_NOT_FOUND));

        // Download from object storage
        Resource resource = objectStoragePort.downloadFile(fileMgmt.getObjectKey());
        
        return new FileDownloadData(fileMgmt.getContentType(), resource, fileMgmt.getOriginalName());
    }

    /**
     * Delete a file
     * @param fileId File ID to delete
     */
    public void deleteFile(String fileId) {
        log.info("Deleting file: {}", fileId);
        
        FileMgmt fileMgmt = fileMgmtRepository.findById(fileId)
                .orElseThrow(() -> new AppException(ErrorCode.FILE_NOT_FOUND));

        try {
            // Delete from object storage
            objectStoragePort.deleteFile(fileMgmt.getObjectKey());
            
            // Update metadata status in MongoDB
            fileMgmt.setStatus(FileObject.FileStatus.DELETED.toString());
            fileMgmtRepository.save(fileMgmt);
            
            log.info("File deleted successfully: {}", fileId);
        } catch (Exception e) {
            log.error("Failed to delete file", e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "File deletion failed");
        }
    }

    /**
     * Extract user ID from JWT token
     */
    private String getUserIdByToken() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return jwt.getClaim("userId");
    }

    /**
     * Record type for file download data
     */
    public record FileDownloadData(String contentType, Resource resource, String originalName) {}
}

