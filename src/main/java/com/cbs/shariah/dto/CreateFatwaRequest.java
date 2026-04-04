package com.cbs.shariah.dto;

import com.cbs.shariah.entity.FatwaCategory;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateFatwaRequest {

    @NotBlank(message = "Fatwa title is required")
    @Size(max = 300)
    private String fatwaTitle;

    @NotNull(message = "Fatwa category is required")
    private FatwaCategory fatwaCategory;

    @NotBlank(message = "Subject is required")
    @Size(max = 500)
    private String subject;

    private String fullText;

    private List<String> aaoifiReferences;

    private List<String> applicableContractTypes;

    private String conditions;

    private LocalDate effectiveDate;

    private LocalDate expiryDate;

    @JsonIgnore
    @AssertTrue(message = "Effective date must be today or in the future")
    public boolean isEffectiveDateValid() {
        return effectiveDate == null || !effectiveDate.isBefore(LocalDate.now());
    }

    @JsonIgnore
    @AssertTrue(message = "Expiry date must be after or equal to effective date")
    public boolean isExpiryDateValid() {
        return effectiveDate == null || expiryDate == null || !expiryDate.isBefore(effectiveDate);
    }
}
