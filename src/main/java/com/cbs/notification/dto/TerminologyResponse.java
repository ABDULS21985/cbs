package com.cbs.notification.dto;

import com.cbs.notification.entity.TerminologyStatus;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TerminologyResponse {
    private Long id;
    private String conventionalTerm;
    private String islamicTermEn;
    private String islamicTermAr;
    private String context;
    private TerminologyStatus status;
    private Long tenantId;
    private Instant createdAt;
    private Instant updatedAt;
}
