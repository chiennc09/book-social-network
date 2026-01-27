package com.chiennc.book.repository.httpclient;

import com.chiennc.book.dto.request.BookRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExternalBookClient {
    RestTemplate restTemplate = new RestTemplate();

    public List<BookRequest> searchExternal(String query) {
        // Thêm &maxResults=20 để có nhiều dữ liệu hơn để sắp xếp
        String url = "https://www.googleapis.com/books/v1/volumes?q=" + query + "&maxResults=20";
        var response = restTemplate.getForObject(url, Map.class);

        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        if (items == null) return List.of();

        List<BookRequest> results = new ArrayList<>();

        for (Map<String, Object> item : items) {
            try {
                Map<String, Object> volumeInfo = (Map<String, Object>) item.get("volumeInfo");
                Map<String, Object> imageLinks = (Map<String, Object>) volumeInfo.get("imageLinks");
                Map<String, Object> accessInfo = (Map<String, Object>) item.get("accessInfo");

                // 1. Lấy Link đọc thực tế (Thứ tự ưu tiên: PDF -> Epub -> WebReader)
                String readLink = extractReadLink(accessInfo);

                // 2. Map dữ liệu an toàn
                results.add(BookRequest.builder()
                        .title((String) volumeInfo.get("title"))
                        .authors((List<String>) volumeInfo.get("authors"))
                        .description((String) volumeInfo.get("description"))
                        .category(extractCategory(volumeInfo))
                        .coverImage(imageLinks != null ? (String) imageLinks.get("thumbnail") : null)
                        .language((String) volumeInfo.get("language"))
                        .publishedYear(extractYear((String) volumeInfo.get("publishedDate")))
                        .totalPages(volumeInfo.get("pageCount") != null ? (Integer) volumeInfo.get("pageCount") : 0)
                        .content(readLink) // Lưu link đọc vào trường content
                        .build());
            } catch (Exception e) {
                log.error("Error mapping book item: {}", e.getMessage());
            }
        }
        return results;
    }

    private String extractReadLink(Map<String, Object> accessInfo) {
        if (accessInfo == null) return null;

        // Ưu tiên PDF download link
        Map<String, Object> pdf = (Map<String, Object>) accessInfo.get("pdf");
        if (pdf != null && Boolean.TRUE.equals(pdf.get("isAvailable"))) {
            String link = (String) pdf.get("downloadLink");
            if (link != null) return link;
        }

        // Kế đến là Epub download link
        Map<String, Object> epub = (Map<String, Object>) accessInfo.get("epub");
        if (epub != null && Boolean.TRUE.equals(epub.get("isAvailable"))) {
            String link = (String) epub.get("downloadLink");
            if (link != null) return link;
        }

        // Cuối cùng là link đọc online của Google (Web Reader)
        return (String) accessInfo.get("webReaderLink");
    }

    private String extractCategory(Map<String, Object> volumeInfo) {
        List<String> categories = (List<String>) volumeInfo.get("categories");
        return (categories != null && !categories.isEmpty()) ? categories.get(0) : "General";
    }

    private int extractYear(String dateStr) {
        if (dateStr == null || dateStr.length() < 4) return 0;
        try {
            return Integer.parseInt(dateStr.substring(0, 4));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}