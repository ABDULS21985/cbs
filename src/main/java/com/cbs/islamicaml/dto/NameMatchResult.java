package com.cbs.islamicaml.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NameMatchResult {
    private String matchedName;
    private BigDecimal matchScore;
    private String listCode;
    private String listEntryRef;
    private String matchType;
}
