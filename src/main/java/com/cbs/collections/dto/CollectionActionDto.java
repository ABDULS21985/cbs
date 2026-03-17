package com.cbs.collections.dto;

import com.cbs.collections.entity.CollectionActionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CollectionActionDto {
    private Long id;
    @NotNull private CollectionActionType actionType;
    @NotBlank private String description;
    private String outcome;
    private BigDecimal promisedAmount;
    private LocalDate promisedDate;
    private Boolean promiseKept;
    private String contactNumber;
    private String contactPerson;
    private BigDecimal visitLatitude;
    private BigDecimal visitLongitude;
    private String visitPhotoUrl;
    private LocalDate nextActionDate;
    private String nextActionType;
    @NotBlank private String performedBy;
    private Instant actionDate;
}
