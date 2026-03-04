package com.chiennc.profile.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import com.chiennc.profile.entity.UserProfile;

@Repository
public interface UserProfileRepository extends Neo4jRepository<UserProfile, String> {
    Optional<UserProfile> findByUserId(String userId);

    /* ================= FOLLOW ================= */
    @Query(
            """
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
    @Query(
            """
		MATCH (u:user_profile {userId: $from}), (t:user_profile {userId: $to})
		MERGE (u)-[:FRIEND_REQUEST]->(t)
	""")
    void sendFriendRequest(String from, String to);

    /* ================= ACCEPT FRIEND ================= */
    @Query(
            """
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
    @Query(
            """
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

    @Query("""
		MATCH (u:user_profile {userId: $userId})-[:FRIEND]-(f:user_profile)
		RETURN f.userId
	""")
    List<String> getFriendIds(String userId);

    @Query("""
		MATCH (u:user_profile {userId: $userId})-[:FRIEND]-(f:user_profile)
		RETURN f
	""")
    List<UserProfile> getFriends(String userId);

    /* ================= SEARCH & RELATIONSHIPS ================= */

    @Query(
            """
		MATCH (u:user_profile)
		WHERE toLower(u.username) CONTAINS toLower($query)
		OR toLower(u.firstName) CONTAINS toLower($query)
		OR toLower(u.lastName) CONTAINS toLower($query)
		RETURN u LIMIT 20
	""")
    List<UserProfile> searchUsers(String query);

    @Query("MATCH (:user_profile {userId: $from})-[:FRIEND]-(:user_profile {userId: $to}) RETURN count(*) > 0")
    boolean checkFriend(String from, String to);

    @Query("MATCH (:user_profile {userId: $to})-[:FRIEND_REQUEST]->(:user_profile {userId: $from}) RETURN count(*) > 0")
    boolean checkIncomingRequest(String from, String to);

    @Query("MATCH (:user_profile {userId: $from})-[:FRIEND_REQUEST]->(:user_profile {userId: $to}) RETURN count(*) > 0")
    boolean checkOutgoingRequest(String from, String to);

    /* ================= LEADERBOARD ================= */
    @Query("""
		MATCH (u:user_profile)
		RETURN u
		ORDER BY u.totalBooksRead DESC
		LIMIT $limit
	""")
    List<UserProfile> getLeaderboard(int limit);
}
