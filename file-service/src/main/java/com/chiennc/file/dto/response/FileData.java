package com.chiennc.file.dto.response;

import org.springframework.core.io.Resource;

/// Record - 1 dạng store data java 21
public record FileData(String contentType, Resource resource) {}
