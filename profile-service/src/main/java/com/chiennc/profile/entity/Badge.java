package com.chiennc.profile.entity;

import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;

import lombok.Builder;
import lombok.Data;

@Node("badge")
@Data
@Builder
public class Badge {
    @Id
    private String code; // Mã huy hiệu (VD: BEGINNER, MASTER_READER)

    private String name; // Tên hiển thị (VD: Mọt sách tập sự)
    private String description; // Mô tả
    private String iconUrl; // Link ảnh huy hiệu
    private int requiredBooks; // Số sách cần đọc để đạt được
}
