package com.chiennc.profile.entity;

import java.time.LocalDate;
import java.util.Set;

import org.springframework.data.annotation.Version;
import org.springframework.data.neo4j.core.schema.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Node("user_profile")
public class UserProfile {
    @Id
    @Property("userId")
    private String userId;

    @Version
    private Long version;

    private String username;
    private String email;

    private String firstName;
    private String lastName;
    private LocalDate dob;
    private String city;
    private String avatar; // [cite: 4]
    private String bio; // [cite: 5]
    private String readingLevel; // [cite: 6]

    // Định nghĩa các mối quan hệ [cite: 64, 66]
    @Relationship(type = "FOLLOWS", direction = Relationship.Direction.OUTGOING)
    private Set<UserProfile> following;

    @Relationship(type = "FRIEND", direction = Relationship.Direction.OUTGOING)
    private Set<UserProfile> friends;

    @Relationship(type = "HAS_BADGE", direction = Relationship.Direction.OUTGOING)
    private Set<Badge> badges;

    private Long totalBooksRead = 0L;
}
