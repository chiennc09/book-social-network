package com.chiennc.book.repository;

import com.chiennc.book.entity.BookRanking;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookRankingRepository extends MongoRepository<BookRanking, String> {

    Optional<BookRanking> findFirstByBookIdAndDate(String bookId, LocalDate date);

    /**
     * Aggregate view counts per bookId within [fromDate, toDate],
     * sorted by totalViews DESC. Used to build the "Trending" list.
     *
     * Spring Data Mongo @Aggregation:
     * Stage 1 - $match: filter by date range
     * Stage 2 - $group: sum viewCount per bookId
     * Stage 3 - $sort: desc by totalViews
     * Stage 4 - $limit: top N
     */
    @Aggregation(pipeline = {
        "{ '$match': { 'date': { '$gte': ?0, '$lte': ?1 } } }",
        "{ '$group': { '_id': '$bookId', 'totalViews': { '$sum': '$viewCount' } } }",
        "{ '$sort': { 'totalViews': -1 } }",
        "{ '$limit': ?2 }"
    })
    List<BookViewAggResult> findTopBooksByDateRange(LocalDate from, LocalDate to, int limit);

    /**
     * Projection interface for the aggregation result.
     * _id maps to bookId in the $group stage.
     */
    interface BookViewAggResult {
        String getId();       // corresponds to _id (bookId)
        long getTotalViews();
    }
}