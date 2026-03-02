package com.chiennc.file.service;

import com.chiennc.file.dto.response.FileData;
import com.chiennc.file.dto.response.FileResponse;
import com.chiennc.file.exception.AppException;
import com.chiennc.file.exception.ErrorCode;
import com.chiennc.file.mapper.FileMgmtMapper;
import com.chiennc.file.repository.FileMgmtRepository;
import com.chiennc.file.repository.FileRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
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
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {
    FileRepository fileRepository;
    FileMgmtRepository fileMgmtRepository;

    FileMgmtMapper fileMgmtMapper;

    public FileResponse uploadFile(MultipartFile file, String type) throws IOException {
        /// Store file
        var fileInfo = fileRepository.store(file, type);

        /// Create file management info
        var fileMgmt = fileMgmtMapper.toFileMgmt(fileInfo);

        fileMgmt.setOwnerId(getUserIdByToken());

        fileMgmt = fileMgmtRepository.save(fileMgmt);

        return FileResponse.builder()
                .originalFileName(file.getOriginalFilename())
                .url(fileInfo.getUrl())
                .build();
    }

    public FileData download(String fileName) throws IOException {
        /// Tìm theo tên file => map thành FileMgmt
        var fileMgmt = fileMgmtRepository.findById(fileName).orElseThrow(
                () -> new AppException(ErrorCode.FILE_NOT_FOUND));

        /// resource - 1 dạng dữ liệu data
        var resource = fileRepository.read(fileMgmt);

        /// Return dạng record - bao gồm content type + resource
        return new FileData(fileMgmt.getContentType(), resource);
    }

    public String getUserIdByToken(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String userId = jwt.getClaim("userId");
        return userId;
    }
}
