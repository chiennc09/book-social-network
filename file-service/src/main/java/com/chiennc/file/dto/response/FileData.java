package com.chiennc.file.dto.response;

import org.springframework.core.io.Resource;

/**
 * Record for file download data
 * Contains content type and resource for streaming to client
 */
public record FileData(String contentType, Resource resource, String originalName) {}
