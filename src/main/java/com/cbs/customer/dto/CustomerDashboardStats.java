package com.cbs.customer.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDashboardStats {

    private long totalActive;
    private long totalDormant;
    private long totalSuspended;
    private long totalClosed;
    private long totalIndividual;
    private long totalCorporate;
    private long totalSme;
}
