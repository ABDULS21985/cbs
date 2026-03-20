package com.cbs.provider.kyc;

import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class UnavailableKycProvider implements KycProvider {

    private final CbsProperties cbsProperties;

    @Override
    public String getProviderName() {
        return StringUtils.hasText(cbsProperties.getKyc().getProvider())
                ? cbsProperties.getKyc().getProvider()
                : "UNCONFIGURED";
    }

    @Override
    public boolean supports(String idType) {
        return true;
    }

    @Override
    public KycResult verify(KycVerifyCommand command) {
        throw new BusinessException(
                "No supported KYC provider is configured. Set cbs.kyc.provider to a supported provider or explicitly use INTERNAL only in isolated environments.",
                HttpStatus.SERVICE_UNAVAILABLE,
                "KYC_PROVIDER_UNAVAILABLE"
        );
    }
}
