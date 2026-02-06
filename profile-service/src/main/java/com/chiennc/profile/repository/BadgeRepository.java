package com.chiennc.profile.repository;

import com.chiennc.profile.entity.Badge;
import com.chiennc.profile.entity.UserProfile;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BadgeRepository extends Neo4jRepository<Badge, String> {
}
