package com.cbs.shariahcompliance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanShariahAuditRequest {

    @NotBlank(message = "Audit type is required")
    private String auditType;

    private String auditScope;

    @NotNull(message = "Period from is required")
    private LocalDate periodFrom;

    @NotNull(message = "Period to is required")
    private LocalDate periodTo;

    @NotBlank(message = "Lead auditor is required")
    private String leadAuditor;

    private List<String> auditTeamMembers;
    private String ssbLiaison;
}
