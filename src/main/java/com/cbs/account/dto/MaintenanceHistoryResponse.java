package com.cbs.account.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceHistoryResponse {
    private Long id;
    private String date;
    private String action;
    private String performedBy;
    private String details;
    private String status;
}
