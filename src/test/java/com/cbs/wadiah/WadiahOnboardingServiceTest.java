package com.cbs.wadiah;

import com.cbs.account.service.AccountComplianceService;
import com.cbs.card.service.CardService;
import com.cbs.cheque.service.ChequeService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.notification.service.NotificationService;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.AcceptShariahDisclosureRequest;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.entity.WadiahOnboardingApplication;
import com.cbs.wadiah.repository.WadiahOnboardingApplicationRepository;
import com.cbs.wadiah.service.WadiahAccountService;
import com.cbs.wadiah.service.WadiahOnboardingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WadiahOnboardingServiceTest {

    @Mock private WadiahOnboardingApplicationRepository applicationRepository;
    @Mock private WadiahAccountService wadiahAccountService;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private AccountComplianceService accountComplianceService;
    @Mock private NotificationService notificationService;
    @Mock private CardService cardService;
    @Mock private ChequeService chequeService;
    @Mock private CurrentTenantResolver currentTenantResolver;

    @InjectMocks
    private WadiahOnboardingService wadiahOnboardingService;

    @Test
    void acceptDisclosure_requiresAllAcknowledgements() {
        WadiahOnboardingApplication application = WadiahOnboardingApplication.builder()
                .id(11L)
                .applicationRef("WAD-APP-1")
                .productCode("WAD-CUR-SAR-001")
                .currencyCode("SAR")
                .channel(WadiahDomainEnums.OnboardingChannel.BRANCH)
                .status(WadiahDomainEnums.ApplicationStatus.SHARIAH_DISCLOSURE)
                .steps(new ArrayList<>())
                .requestedFeatures(new LinkedHashMap<>())
                .shariahDisclosurePresented(true)
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();
        when(applicationRepository.findById(11L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> wadiahOnboardingService.acceptShariahDisclosure(11L,
                AcceptShariahDisclosureRequest.builder()
                        .shariahDisclosureAccepted(true)
                        .hibahNonGuaranteeAcknowledged(false)
                        .zakatObligationAcknowledged(true)
                        .build()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("DISCLOSURE_INCOMPLETE");
    }

    @Test
    void submitForApproval_blocksWhenDisclosureNotAccepted() {
        WadiahOnboardingApplication application = WadiahOnboardingApplication.builder()
                .id(12L)
                .applicationRef("WAD-APP-2")
                .productCode("WAD-CUR-SAR-001")
                .currencyCode("SAR")
                .channel(WadiahDomainEnums.OnboardingChannel.BRANCH)
                .status(WadiahDomainEnums.ApplicationStatus.COMPLIANCE_CHECK)
                .steps(new ArrayList<>())
                .requestedFeatures(new LinkedHashMap<>())
                .kycVerified(true)
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();
        when(applicationRepository.findById(12L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> wadiahOnboardingService.submitForApproval(12L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("DISCLOSURE_INCOMPLETE");
    }
}
