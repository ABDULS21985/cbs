package com.cbs.customer.dto;

import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycVerificationResponse {

    private Long customerId;
    private String cifNumber;
    private String idType;
    private String idNumber;
    private VerificationStatus status;
    private String verificationProvider;
    private String verificationReference;
    private String failureReason;
    private Instant verifiedAt;

    public enum VerificationStatus {
        VERIFIED,
        FAILED,
        PENDING,
        EXPIRED_DOCUMENT,
        MISMATCH
    }
}
