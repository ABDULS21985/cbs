package com.cbs.customer.dto;

import com.cbs.customer.entity.RelationshipType;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RelationshipDto {

    private Long id;
    private Long customerId;
    private String customerCifNumber;
    private String customerDisplayName;

    @NotNull(message = "Related customer ID is required")
    private Long relatedCustomerId;

    private String relatedCustomerCifNumber;
    private String relatedCustomerDisplayName;

    @NotNull(message = "Relationship type is required")
    private RelationshipType relationshipType;

    private BigDecimal ownershipPercentage;
    private Boolean isActive;
    private String notes;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
}
