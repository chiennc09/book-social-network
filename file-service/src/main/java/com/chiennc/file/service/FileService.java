package com.chiennc.file.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
public class FileService {
    public Object uploadFile(MultipartFile file) throws IOException {
        /// Xác định path folder lưu file
        Path folder = Paths.get("E:/Project/book-social-network/upload");

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

        return null;
    }
}
