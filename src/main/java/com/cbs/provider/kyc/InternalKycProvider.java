package com.cbs.provider.kyc;

import com.cbs.common.config.CbsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Default internal KYC provider. Validates ID format against configured regex patterns.
 * For production, swap to Onfido, Jumio, SumSub, or a country-specific provider.
 */
@Component
@ConditionalOnProperty(name = "cbs.kyc.provider", havingValue = "INTERNAL", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class InternalKycProvider implements KycProvider {

    private final CbsProperties cbsProperties;

    @Override
    public String getProviderName() {
        return "INTERNAL";
    }

    @Override
    public boolean supports(String idType) {
        return cbsProperties.getKyc().getIdTypes().stream()
                .anyMatch(t -> t.getCode().equalsIgnoreCase(idType));
    }

    @Override
    public KycResult verify(KycVerifyCommand command) {
        if (!StringUtils.hasText(command.getIdNumber()) || command.getIdNumber().length() < 3) {
            return KycResult.builder()
                    .verified(false).status("FAILED").providerName(getProviderName())
                    .failureReason("ID number is too short or empty")
                    .build();
        }

        // Validate against configured regex for this ID type
        var idTypeConfig = cbsProperties.getKyc().getIdTypes().stream()
                .filter(t -> t.getCode().equalsIgnoreCase(command.getIdType()))
                .findFirst();

        if (idTypeConfig.isPresent() && StringUtils.hasText(idTypeConfig.get().getValidationRegex())) {
            boolean formatValid = Pattern.matches(idTypeConfig.get().getValidationRegex(), command.getIdNumber());
            if (!formatValid) {
                return KycResult.builder()
                        .verified(false).status("FAILED").providerName(getProviderName())
                        .failureReason("ID number does not match expected format for type: " + command.getIdType())
                        .build();
            }
        }

        log.info("Internal KYC verification passed: idType={}, country={}",
                command.getIdType(), command.getCountry());

        return KycResult.builder()
                .verified(true).status("VERIFIED").providerName(getProviderName())
                .providerReference("INT-" + System.currentTimeMillis())
                .verifiedAt(Instant.now())
                .providerMetadata(Map.of("method", "FORMAT_VALIDATION"))
                .build();
    }
}
