package com.chiennc.file.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * FileResponse DTO - returned when file is uploaded
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileResponse {
    String originalFileName;
    String url;  // Public accessible URL or object key
    String fileId;  // MongoDB document ID
    long size;
    String contentType;
    long uploadedAt;
}
