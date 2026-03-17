package com.cbs.overdraft.dto;

import com.cbs.overdraft.entity.FacilityStatus;
import com.cbs.overdraft.entity.FacilityType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateFacilityRequest {
    @NotNull private Long accountId;
    @NotNull private FacilityType facilityType;
    @NotNull @DecimalMin("0.01") private BigDecimal sanctionedLimit;
    @NotNull @DecimalMin("0.0001") private BigDecimal interestRate;
    private BigDecimal penaltyRate;
    private String dayCountConvention;
    @NotNull private LocalDate expiryDate;
    private Boolean autoRenewal;
    private Integer maxRenewals;
    private Integer interestPostingDay;
}
