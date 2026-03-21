package com.cbs.nostro.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplianceScoreDto {
    private String month;
    private double score;
    private double target;
}
