package com.chiennc.file.controller;

import com.chiennc.file.dto.ApiResponse;
import com.chiennc.file.dto.response.FileResponse;
import com.chiennc.file.service.FileService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * File Controller - REST endpoints for file operations
 */
@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileController {
    FileService fileService;

    /**
     * Upload a file
     * @param file MultipartFile to upload
     * @param type File type/category (covers, epubs, pdfs, avatars)
     * @return FileResponse with URL
     */
    @PostMapping("/media/upload")
    ApiResponse<FileResponse> uploadMedia(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "type", defaultValue = "others") String type) {
        return ApiResponse.<FileResponse>builder()
                .result(fileService.uploadFile(file, type))
                .build();
    }

    /**
     * Download a file by ID
     * @param fileId File ID (MongoDB document ID)
     * @return File content
     */
    @GetMapping("/media/download/{fileId}")
    ResponseEntity<Resource> downloadMedia(@PathVariable String fileId) {
        var fileData = fileService.download(fileId);
        
        // Use inline so browsers can display images/pdfs directly
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, fileData.contentType())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileData.originalName() + "\"")
                .body(fileData.resource());
    }

    /**
     * Delete a file
     * @param fileId File ID to delete
     */
    @DeleteMapping("/media/{fileId}")
    ApiResponse<Void> deleteMedia(@PathVariable String fileId) {
        fileService.deleteFile(fileId);
        return ApiResponse.<Void>builder()
                .message("File deleted successfully")
                .build();
    }
}
