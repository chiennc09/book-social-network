package com.chiennc.book.repository;

import com.chiennc.book.constant.ReadStatus;
import com.chiennc.book.entity.ReadHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ReadHistoryRepository extends MongoRepository<ReadHistory, String> {
    // Tìm lịch sử đọc của 1 user với 1 cuốn sách cụ thể
    Optional<ReadHistory> findByUserIdAndBookId(String userId, String bookId);

    List<ReadHistory> findAllByUserIdAndStatus(String userId, ReadStatus status);
}