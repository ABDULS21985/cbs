package com.cbs.provider.kyc;

import lombok.*;

import java.time.Instant;
import java.util.Map;

/**
 * Pluggable KYC/Identity verification provider.
 * Implementations: InternalKycProvider (default), OnfidoKycProvider, JumioKycProvider,
 * SumSubKycProvider, or any country-specific provider (NIBSS BVN, NIMC NIN, Aadhaar, etc.)
 *
 * Providers are selected via cbs.kyc.provider in application.yml.
 */
public interface KycProvider {

    String getProviderName();

    boolean supports(String idType);

    KycResult verify(KycVerifyCommand command);

    @Getter @Builder
    class KycVerifyCommand {
        private final String idType;
        private final String idNumber;
        private final String firstName;
        private final String lastName;
        private final String dateOfBirth;
        private final String country;
        private final Map<String, String> additionalData;
    }

    @Getter @Builder
    class KycResult {
        private final boolean verified;
        private final String status; // VERIFIED, FAILED, PENDING, EXPIRED_DOCUMENT, MISMATCH
        private final String providerName;
        private final String providerReference;
        private final String failureReason;
        private final Instant verifiedAt;
        private final Map<String, Object> providerMetadata;
    }
}
