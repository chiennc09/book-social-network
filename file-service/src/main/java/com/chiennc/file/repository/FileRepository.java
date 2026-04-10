package com.chiennc.file.repository;

import com.chiennc.file.dto.FileInfo;
import com.chiennc.file.entity.FileMgmt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Repository;
import org.springframework.util.DigestUtils;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Repository
public class FileRepository {
    @Value("${app.file.storage-dir:./upload}")
    String storageDir;

    @Value("${app.file.download-prefix:http://localhost:8888/file/media/download/}")
    String urlPrefix;

    /**
     * Deprecated: File storage is now handled by MinIOStorageAdapter.uploadFile()
     * This method is no longer used as files are stored in MinIO, not on local disk
     */
    @Deprecated
    public FileInfo store(MultipartFile file, String type) throws IOException {
        /// Xác định path folder lưu file
        Path baseFolder = Paths.get(storageDir);
        Path folder = baseFolder.resolve(type);
        
        if (!Files.exists(folder)) {
            Files.createDirectories(folder);
        }

        /// Lấy tên định dạng gốc
        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            originalFilename = originalFilename.replaceAll("\\s+", "_");
        } else {
            originalFilename = "file";
        }

        String fileName = UUID.randomUUID().toString() + "_" + originalFilename;

        /// Lấy đường dẫn hoàn chỉnh file mong muốn
        Path filePath = folder.resolve(fileName).normalize().toAbsolutePath();

        /// Convert file từ người dùng => file mong muốn
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return FileInfo.builder()
                .name(fileName)
                .size(file.getSize())
                .contentType(file.getContentType())
                .md5Checksum(DigestUtils.md5DigestAsHex(file.getInputStream()))
                .path(filePath.toString())
                .url(urlPrefix + fileName)
                .build();
    }

    /**
     * Deprecated: File reading is now handled by MinIOStorageAdapter.downloadFile()
     * This method is no longer used as files are stored in MinIO, not on local disk
     */
    @Deprecated
    public Resource read(FileMgmt fileMgmt) {
        throw new RuntimeException("Local disk file reading is deprecated. Use MinIOStorageAdapter.downloadFile() instead.");
    }
}
