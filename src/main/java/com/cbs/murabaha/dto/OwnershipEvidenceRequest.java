package com.cbs.murabaha.dto;

import com.cbs.murabaha.entity.MurabahaDomainEnums;
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
public class OwnershipEvidenceRequest {

    @NotNull
    private MurabahaDomainEnums.OwnershipEvidenceType evidenceType;

    @NotBlank
    private String evidenceRef;

    @NotNull
    private LocalDate ownershipDate;

    private MurabahaDomainEnums.PossessionType possessionType;
    private String documentPath;
    private String possessionLocation;
    private Boolean registeredInBankName;
    private String bankNameOnTitle;
    private Boolean insuranceDuringOwnership;
    private String insurancePolicyRef;
    private String insuranceProvider;
    private BigDecimal insuranceCoverageAmount;
    private Boolean assetInspected;
    private LocalDate inspectionDate;
    private String inspectionNotes;
}
