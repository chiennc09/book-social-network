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
    @Value("${app.file.storage-dir}")
    String storageDir;

    @Value("${app.file.download-prefix}")
    String urlPrefix;

    public FileInfo store(MultipartFile file) throws IOException {
        /// Xác định path folder lưu file
        Path folder = Paths.get(storageDir);

        /// Lấy tên định dạng file (Đuôi)
        String fileExtension = StringUtils
                .getFilenameExtension(file.getOriginalFilename());

        String fileName = Objects.isNull(fileExtension)
                ? UUID.randomUUID().toString()
                : UUID.randomUUID() + "." + fileExtension;

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

    public Resource read(FileMgmt fileMgmt) throws IOException {
        /// Đọc file from đĩa cứng - theo array byte
        var data = Files.readAllBytes(Path.of(fileMgmt.getPath()));
        return new ByteArrayResource(data);
    }
}
