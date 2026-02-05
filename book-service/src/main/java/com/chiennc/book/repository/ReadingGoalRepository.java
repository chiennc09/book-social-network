package com.chiennc.book.repository;
import com.chiennc.book.entity.ReadingGoal;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface ReadingGoalRepository extends MongoRepository<ReadingGoal, String> {
    Optional<ReadingGoal> findByUserIdAndTimeFrameAndGoalType(String userId, String timeFrame, String goalType);
}