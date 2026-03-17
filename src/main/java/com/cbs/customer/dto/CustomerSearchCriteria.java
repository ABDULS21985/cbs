package com.cbs.customer.dto;

import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerSearchCriteria {

    private String searchTerm;
    private CustomerType customerType;
    private CustomerStatus status;
    private RiskRating riskRating;
    private String branchCode;
    private String sectorCode;
    private String industryCode;
    private String nationality;
    private String stateOfOrigin;
    private LocalDate createdAfter;
    private LocalDate createdBefore;
    private String relationshipManager;
    private String segmentCode;
}
