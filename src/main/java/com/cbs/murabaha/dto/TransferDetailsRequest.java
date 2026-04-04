package com.cbs.murabaha.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferDetailsRequest {

    @NotNull
    private LocalDate transferDate;

    @NotBlank
    private String transferDocumentRef;

    private Boolean assetRegisteredToCustomer;
    private LocalDate customerAcknowledgmentDate;
    private String customerAcknowledgmentRef;
}
