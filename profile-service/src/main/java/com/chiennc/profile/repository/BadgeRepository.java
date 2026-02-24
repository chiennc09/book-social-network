package com.chiennc.profile.repository;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.stereotype.Repository;

import com.chiennc.profile.entity.Badge;

@Repository
public interface BadgeRepository extends Neo4jRepository<Badge, String> {}
