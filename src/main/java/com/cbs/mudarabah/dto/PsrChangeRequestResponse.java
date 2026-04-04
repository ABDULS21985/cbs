package com.cbs.mudarabah.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PsrChangeRequestResponse {

    private Long id;
    private Long accountId;
    private Long mudarabahAccountId;
    private BigDecimal currentPsrCustomer;
    private BigDecimal currentPsrBank;
    private BigDecimal proposedPsrCustomer;
    private BigDecimal proposedPsrBank;
    private String changeReason;
    private String reasonDescription;
    private boolean customerConsentRequired;
    private boolean customerConsentGiven;
    private LocalDateTime customerConsentDate;
    private String customerConsentMethod;
    private LocalDate effectiveDate;
    private String status;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private LocalDateTime appliedAt;
}
