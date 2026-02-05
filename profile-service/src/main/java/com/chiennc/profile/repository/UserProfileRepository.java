package com.chiennc.profile.repository;

import com.chiennc.profile.entity.UserProfile;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUserId(String userId);

    /* ================= FOLLOW ================= */
    @Query("""
        MATCH (u:user_profile {userId: $from}), (t:user_profile {userId: $to})
        MERGE (u)-[:FOLLOWS]->(t)
    """)
    void followUser(String from, String to);

    @Query("""
        MATCH (u:user_profile {userId: $from})-[r:FOLLOWS]->(t:user_profile {userId: $to})
        DELETE r
    """)
    void unfollowUser(String from, String to);

    /* ================= FRIEND REQUEST ================= */
    @Query("""
        MATCH (u:user_profile {userId: $from}), (t:user_profile {userId: $to})
        MERGE (u)-[:FRIEND_REQUEST]->(t)
    """)
    void sendFriendRequest(String from, String to);

    /* ================= ACCEPT FRIEND ================= */
    @Query("""
        MATCH (u:user_profile {userId: $from})<-[r:FRIEND_REQUEST]-(t:user_profile {userId: $to})
        DELETE r
        MERGE (u)-[:FRIEND]-(t)
    """)
    void acceptFriend(String from, String to);

    /* ================= UNFRIEND ================= */
    @Query("""
        MATCH (u:user_profile {userId: $from})-[r:FRIEND]-(t:user_profile {userId: $to})
        DELETE r
    """)
    void removeFriend(String from, String to);

    // Lấy danh sách những người đã gửi lời mời kết bạn cho mình
    @Query("""
    MATCH (u:user_profile {userId: $userId})<-[:FRIEND_REQUEST]-(sender:user_profile)
    RETURN sender
    """)
    List<UserProfile> getIncomingFriendRequests(String userId);

    // Lấy danh sách những người mình đã gửi lời mời (đang chờ họ đồng ý)
    @Query("""
    MATCH (u:user_profile {userId: $userId})-[:FRIEND_REQUEST]->(receiver:user_profile)
    RETURN receiver
    """)
    List<UserProfile> getOutgoingFriendRequests(String userId);

    /* ================= COUNT ================= */

    @Query("""
        MATCH (:user_profile {userId: $userId})<-[:FOLLOWS]-()
        RETURN count(*)
    """)
    Long countFollowers(String userId);

    @Query("""
        MATCH (:user_profile {userId: $userId})-[:FOLLOWS]->()
        RETURN count(*)
    """)
    Long countFollowing(String userId);

    @Query("""
        MATCH (:user_profile {userId: $userId})-[:FRIEND]->()
        RETURN count(*)
    """)
    Long countFriends(String userId);
}

