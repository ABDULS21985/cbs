package com.cbs.nostro.dto;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ComplianceCheckDto {
    private String id;
    private String requirement;
    private String description;
    private boolean met;
    private String lastChecked;
}
