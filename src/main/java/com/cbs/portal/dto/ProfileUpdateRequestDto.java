package com.cbs.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileUpdateRequestDto {

    private Long id;

    @NotNull(message = "Request type is required")
    private String requestType;

    private String oldValue;

    @NotBlank(message = "New value is required")
    private String newValue;

    private String status;
    private String channel;
    private String submittedAt;
    private String reviewedAt;
    private String reviewedBy;
    private String rejectionReason;
}
