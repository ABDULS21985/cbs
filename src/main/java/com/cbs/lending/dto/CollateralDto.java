package com.cbs.lending.dto;

import com.cbs.lending.entity.CollateralType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollateralDto {
    private Long id;
    private String collateralNumber;
    private Long customerId;
    @NotNull private CollateralType collateralType;
    @NotBlank private String description;
    @NotNull @DecimalMin("0.01") private BigDecimal marketValue;
    private BigDecimal forcedSaleValue;
    private LocalDate lastValuationDate;
    private String valuationSource;
    @Size(min = 3, max = 3) private String currencyCode;
    private String lienStatus;
    private BigDecimal lienAmount;
    private Boolean isInsured;
    private String insurancePolicyNumber;
    private LocalDate insuranceExpiryDate;
    private BigDecimal insuranceValue;
    private String location;
    private String registrationNumber;
    private String registrationAuthority;
    private String status;
    private BigDecimal allocatedValue;
    private BigDecimal coveragePercentage;
}
