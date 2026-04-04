package com.cbs.productfactory.islamic.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecordShariahReviewRequest {

    private LocalDate reviewDate;
    private LocalDate nextReviewDate;
    private String reviewedBy;
    private String notes;
}