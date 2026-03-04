package com.chiennc.book.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Badge {
    private String id;
    private String code;
    private String name;
    private String description;
    private String iconUrl;
}
