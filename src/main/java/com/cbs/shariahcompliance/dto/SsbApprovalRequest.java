package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SsbApprovalRequest {

    @NotBlank(message = "Approval reference is required")
    private String approvalRef;

    @NotBlank(message = "Approved by is required")
    private String approvedBy;

    private String comments;
}
