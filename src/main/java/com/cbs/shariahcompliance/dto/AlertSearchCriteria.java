package com.cbs.shariahcompliance.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertSearchCriteria {
    private String status;
    private String severity;
    private String alertType;
    private Long customerId;
    private LocalDateTime dateFrom;
    private LocalDateTime dateTo;
}
