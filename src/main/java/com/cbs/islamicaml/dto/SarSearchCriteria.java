package com.cbs.islamicaml.dto;

import lombok.*;

import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SarSearchCriteria {
    private String status;
    private String jurisdiction;
    private Long subjectCustomerId;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private String sarType;
    private Boolean isUrgent;
}
