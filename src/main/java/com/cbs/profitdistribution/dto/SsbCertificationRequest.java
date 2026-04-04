package com.cbs.profitdistribution.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SsbCertificationRequest {

    @NotBlank(message = "SSB certification reference is required")
    private String ssbCertificationRef;

    private String ssbComments;

    @NotBlank(message = "Reviewed by is required")
    private String reviewedBy;
}
