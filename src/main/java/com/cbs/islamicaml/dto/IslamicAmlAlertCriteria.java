package com.cbs.islamicaml.dto;

import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IslamicAmlAlertCriteria {
    private String status;
    private String ruleCode;
    private Long customerId;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String severity;
}
