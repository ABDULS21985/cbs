package com.cbs.murabaha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssetDamageReportRequest {

    @NotNull
    private LocalDate incidentDate;

    @NotBlank
    private String description;

    private BigDecimal estimatedLoss;
    private Boolean totalLoss;
}
