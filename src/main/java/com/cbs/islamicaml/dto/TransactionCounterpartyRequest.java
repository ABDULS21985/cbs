package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionCounterpartyRequest {

    @NotBlank(message = "Entity name is required")
    private String entityName;

    @NotBlank(message = "Entity type is required")
    private String entityType;

    private String entityCountry;
    private Map<String, Object> entityIdentifiers;
    private String transactionRef;
    private String contractRef;
}
