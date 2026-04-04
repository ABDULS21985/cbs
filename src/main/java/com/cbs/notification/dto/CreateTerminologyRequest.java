package com.cbs.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateTerminologyRequest {
    @NotBlank
    private String conventionalTerm;
    @NotBlank
    private String islamicTermEn;
    @NotBlank
    private String islamicTermAr;
    @NotBlank
    private String context;
}
