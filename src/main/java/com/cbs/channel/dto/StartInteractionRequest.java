package com.cbs.channel.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StartInteractionRequest {

    private Long customerId;

    @NotBlank(message = "Interaction type is required")
    @Size(max = 15, message = "Interaction type must not exceed 15 characters")
    private String interactionType;

    @Size(max = 20, message = "Channel must not exceed 20 characters")
    private String channelUsed;

    private Boolean staffAssisted;

    @Size(max = 80, message = "Staff ID must not exceed 80 characters")
    private String staffId;
}
