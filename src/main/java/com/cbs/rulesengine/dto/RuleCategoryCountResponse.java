package com.cbs.rulesengine.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleCategoryCountResponse {
    private String category;
    private String subCategory;
    private Long count;
}
