package com.cbs.islamicaml.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EntityScreeningRequest {

    @NotBlank(message = "Entity name is required")
    private String entityName;

    private String entityType;
    private String entityCountry;
    private Map<String, Object> entityIdentifiers;
    private Long accountId;
    private String transactionType;
    private String shariahProductCode;
    private String shariahContractRef;
}
