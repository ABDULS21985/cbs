package com.cbs.customer.dto;

import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSummaryResponse {

    private Long id;
    private String cifNumber;
    private CustomerType customerType;
    private CustomerStatus status;
    private RiskRating riskRating;
    private String displayName;
    private String email;
    private String phonePrimary;
    private String branchCode;
    private Instant createdAt;
}
