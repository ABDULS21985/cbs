package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InitiateAssetPurchaseRequest {

    @NotNull
    private MurabahaDomainEnums.AssetCategory assetCategory;

    @NotBlank
    private String assetDescription;

    private Map<String, Object> assetSpecification;

    @NotNull
    private MurabahaDomainEnums.AssetCondition newOrUsed;

    @NotBlank
    private String supplierName;

    private String supplierRegistrationNumber;
    private String supplierAddress;
    private String supplierContactPerson;
    private String supplierContactPhone;
    private String supplierBankAccount;

    @NotBlank
    private String supplierQuoteRef;

    @NotNull
    private LocalDate supplierQuoteDate;

    private LocalDate supplierQuoteExpiry;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal supplierQuoteAmount;
}
