package com.cbs.islamicaml.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OverlappingEntity {
    private String entityName;
    private String shariahListCode;
    private String sanctionsListCode;
    private String shariahReason;
    private String sanctionsReason;
}
