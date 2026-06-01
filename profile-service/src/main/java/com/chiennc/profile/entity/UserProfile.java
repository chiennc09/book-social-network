package com.chiennc.profile.entity;

import java.time.LocalDate;
import java.util.Set;

import org.springframework.data.annotation.Version;
import org.springframework.data.neo4j.core.schema.*;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

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
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<UserProfile> following;

    @Relationship(type = "FRIEND", direction = Relationship.Direction.OUTGOING)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<UserProfile> friends;

    @Relationship(type = "HAS_BADGE", direction = Relationship.Direction.OUTGOING)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Set<Badge> badges;

    private Long totalBooksRead = 0L;

    public String getDisplayName() {
        String fullName = "";
        if (firstName != null && !firstName.trim().isEmpty()) {
            fullName += firstName.trim();
        }
        if (lastName != null && !lastName.trim().isEmpty()) {
            if (!fullName.isEmpty()) fullName += " ";
            fullName += lastName.trim();
        }
        if (fullName.isEmpty()) return username;
        return fullName;
    }
}
