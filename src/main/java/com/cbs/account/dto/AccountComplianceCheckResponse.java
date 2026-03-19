package com.cbs.account.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountComplianceCheckResponse {

    private boolean kycVerified;
    private String kycLevel;
    private boolean amlClear;
    private boolean duplicateFound;
    private boolean dormantAccountExists;
    private String dormantAccountId;
}
