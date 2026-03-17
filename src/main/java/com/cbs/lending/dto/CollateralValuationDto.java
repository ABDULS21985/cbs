package com.cbs.lending.dto;

import com.cbs.lending.entity.ValuationMethod;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollateralValuationDto {
    private Long id;
    @NotNull private LocalDate valuationDate;
    @NotNull @DecimalMin("0.01") private BigDecimal marketValue;
    private BigDecimal forcedSaleValue;
    @NotNull private ValuationMethod valuationMethod;
    private String valuerName;
    private String valuerOrganisation;
    private String valuerLicenseNumber;
    private String reportReference;
    private String reportUrl;
    private String notes;
    private String status;
    private LocalDate nextValuationDate;
}
