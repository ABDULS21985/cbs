package com.cbs.common.guard;

import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SyntheticCapabilityGuard {

    private static volatile boolean allowSyntheticServices = true;
    private static volatile boolean allowInternalKyc = true;

    private final CbsProperties cbsProperties;

    @PostConstruct
    void initialize() {
        allowSyntheticServices = cbsProperties.getSimulation().isAllowSyntheticServices();
        allowInternalKyc = cbsProperties.getSimulation().isAllowInternalKyc();
    }

    @PreDestroy
    void reset() {
        allowSyntheticServices = true;
        allowInternalKyc = true;
    }

    public static void requireSyntheticServices(String capability, String remediation) {
        if (!allowSyntheticServices) {
            throw new BusinessException(
                    capability + " is backed by synthetic or non-production logic and is disabled. " + remediation,
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "NON_PRODUCTION_CAPABILITY_DISABLED"
            );
        }
    }

    public static void requireInternalKyc() {
        if (!allowInternalKyc) {
            throw new BusinessException(
                    "The INTERNAL KYC provider only performs format validation and is disabled outside isolated environments. " +
                            "Configure a real KYC provider or explicitly enable internal KYC for test/load usage.",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "INTERNAL_KYC_DISABLED"
            );
        }
    }

    public static void enableSyntheticServicesForTesting() {
        allowSyntheticServices = true;
    }

    public static void enableInternalKycForTesting() {
        allowInternalKyc = true;
    }
}
