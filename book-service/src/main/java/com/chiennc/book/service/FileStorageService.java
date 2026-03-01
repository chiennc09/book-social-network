/*
package com.chiennc.book.service;

import jakarta.annotation.PostConstruct;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

// @Service
public class FileStorageService {
    private final Path root = Paths.get("uploads");

    @PostConstruct
    public void init() {
        try {
            if (!Files.exists(root)) Files.createDirectory(root);
            if (!Files.exists(root.resolve("covers"))) Files.createDirectory(root.resolve("covers"));
            if (!Files.exists(root.resolve("pdfs"))) Files.createDirectory(root.resolve("pdfs"));
            if (!Files.exists(root.resolve("epubs"))) Files.createDirectory(root.resolve("epubs"));
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage!");
        }
    }

    public String save(MultipartFile file, String subDir) {
        try {
            Path folder = root.resolve(subDir);
            // Tạo tên file ngẫu nhiên để tránh trùng lặp: uuid_filename
            String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), folder.resolve(filename));
            return filename; // Chỉ lưu tên file vào DB, không lưu full path
        } catch (Exception e) {
            throw new RuntimeException("Could not store the file. Error: " + e.getMessage());
        }
    }

    // Hàm mới: Load file để phục vụ việc đọc/download
    public Resource load(String filename, String subDir) {
        try {
            Path file = root.resolve(subDir).resolve(filename);
            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("Could not read the file!");
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error: " + e.getMessage());
        }
    }
}
*/