package com.cbs.rulesengine.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionComparisonResponse {
    private Integer version1;
    private Integer version2;
    private List<VersionDifferenceResponse> differences;
}
