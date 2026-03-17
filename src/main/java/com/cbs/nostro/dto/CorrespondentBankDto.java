package com.cbs.nostro.dto;

import com.cbs.nostro.entity.CorrespondentRelationshipType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.Instant;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CorrespondentBankDto {

    private Long id;

    @NotBlank(message = "Bank code is required")
    @Size(max = 20)
    private String bankCode;

    @NotBlank(message = "Bank name is required")
    @Size(max = 200)
    private String bankName;

    @Size(max = 11)
    private String swiftBic;

    @NotBlank(message = "Country is required")
    @Size(min = 3, max = 3)
    private String country;

    private String city;

    @NotNull(message = "Relationship type is required")
    private CorrespondentRelationshipType relationshipType;

    private Boolean isActive;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private Map<String, Object> metadata;
    private Instant createdAt;
}
