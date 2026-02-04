package com.chiennc.book.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class FileStorageService {
    private final Path root = Paths.get("uploads");

    @PostConstruct
    public void init() {
        try {
            if (!Files.exists(root)) Files.createDirectory(root);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage!");
        }
    }

    public String save(MultipartFile file, String subDir) {
        try {
            Path folder = root.resolve(subDir);
            if (!Files.exists(folder)) Files.createDirectories(folder);

            String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), folder.resolve(filename));
            return folder.resolve(filename).toString();
        } catch (Exception e) {
            throw new RuntimeException("Could not store the file. Error: " + e.getMessage());
        }
    }
}
