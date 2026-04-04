package com.cbs.mudarabah.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.mudarabah.dto.CustomerConsentDetails;
import com.cbs.mudarabah.dto.InitiatePsrChangeRequest;
import com.cbs.mudarabah.dto.PsrResolution;
import com.cbs.mudarabah.entity.CustomerConsentMethod;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.ProfitSharingRatioSchedule;
import com.cbs.mudarabah.entity.PsrChangeReason;
import com.cbs.mudarabah.entity.PsrChangeRequest;
import com.cbs.mudarabah.entity.PsrChangeStatus;
import com.cbs.mudarabah.entity.PsrScheduleType;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.ProfitSharingRatioScheduleRepository;
import com.cbs.mudarabah.repository.PsrChangeRequestRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PsrServiceTest {

    @Mock private ProfitSharingRatioScheduleRepository scheduleRepository;
    @Mock private PsrChangeRequestRepository changeRequestRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;

    @InjectMocks private PsrService service;

    private MudarabahAccount savingsAccount;
    private MudarabahAccount termDepositAccount;

    @BeforeEach
    void setUp() {
        savingsAccount = MudarabahAccount.builder()
                .id(1L)
                .contractReference("MDR-SAV-2026-000001")
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.SAVINGS)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .lossDisclosureAccepted(true)
                .contractVersion(1)
                .psrAgreedVersion(1)
                .build();

        termDepositAccount = MudarabahAccount.builder()
                .id(2L)
                .contractReference("MDR-TD-2026-000001")
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.TERM_DEPOSIT)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .lossDisclosureAccepted(true)
                .contractVersion(1)
                .psrAgreedVersion(1)
                .build();
    }

    // -----------------------------------------------------------------------
    // resolvePsr tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Resolve PSR with FLAT schedule returns flat PSR values")
    void resolvePsr_flatSchedule_returnsDefault() {
        ProfitSharingRatioSchedule schedule = ProfitSharingRatioSchedule.builder()
                .id(1L)
                .productTemplateId(10L)
                .scheduleName("Standard Flat PSR")
                .scheduleType(PsrScheduleType.FLAT)
                .flatPsrCustomer(new BigDecimal("65.0000"))
                .flatPsrBank(new BigDecimal("35.0000"))
                .effectiveFrom(LocalDate.now().minusDays(30))
                .status("ACTIVE")
                .build();

        when(scheduleRepository.findActiveSchedule(eq(10L), any(LocalDate.class)))
                .thenReturn(Optional.of(schedule));

        PsrResolution resolution = service.resolvePsr(10L, Map.of());

        assertThat(resolution.getCustomerRatio()).isEqualByComparingTo("65.0000");
        assertThat(resolution.getBankRatio()).isEqualByComparingTo("35.0000");
        assertThat(resolution.getResolutionMethod()).isEqualTo("FLAT");
        assertThat(resolution.isNegotiated()).isFalse();
    }

    @Test
    @DisplayName("Resolve PSR with tiered schedule uses decision table evaluator")
    void resolvePsr_tieredByTenor_correctTier() {
        ProfitSharingRatioSchedule schedule = ProfitSharingRatioSchedule.builder()
                .id(2L)
                .productTemplateId(10L)
                .scheduleName("Tiered by Tenor")
                .scheduleType(PsrScheduleType.TIERED_BY_TENOR)
                .decisionTableCode("MDR_PSR_TENOR_TIERS")
                .effectiveFrom(LocalDate.now().minusDays(30))
                .status("ACTIVE")
                .build();

        when(scheduleRepository.findActiveSchedule(eq(10L), any(LocalDate.class)))
                .thenReturn(Optional.of(schedule));

        DecisionResultResponse dtResult = DecisionResultResponse.builder()
                .matched(true)
                .outputs(Map.of("psr_customer", "75.0000", "psr_bank", "25.0000"))
                .build();
        when(decisionTableEvaluator.evaluateByRuleCode(eq("MDR_PSR_TENOR_TIERS"), anyMap()))
                .thenReturn(dtResult);

        Map<String, Object> context = Map.of("tenor_months", 6, "amount", new BigDecimal("50000"));
        PsrResolution resolution = service.resolvePsr(10L, context);

        assertThat(resolution.getCustomerRatio()).isEqualByComparingTo("75.0000");
        assertThat(resolution.getBankRatio()).isEqualByComparingTo("25.0000");
        assertThat(resolution.getResolutionMethod()).isEqualTo("TIERED_BY_TENOR");
        assertThat(resolution.getDecisionTableUsed()).isEqualTo("MDR_PSR_TENOR_TIERS");
        verify(decisionTableEvaluator).evaluateByRuleCode(eq("MDR_PSR_TENOR_TIERS"), eq(context));
    }

    // -----------------------------------------------------------------------
    // validatePsrIsRatioNotFixedAmount tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Validate PSR sum equals 100 passes validation")
    void validatePsr_sumEquals100_valid() {
        // This should not throw
        service.validatePsrIsRatioNotFixedAmount(new BigDecimal("70.0000"), new BigDecimal("30.0000"));
    }

    @Test
    @DisplayName("Validate PSR sum not equal to 100 is rejected at change request level")
    void validatePsr_sumNot100_rejected() {
        when(mudarabahAccountRepository.findById(1L)).thenReturn(Optional.of(savingsAccount));

        InitiatePsrChangeRequest request = InitiatePsrChangeRequest.builder()
                .accountId(100L)
                .mudarabahAccountId(1L)
                .proposedPsrCustomer(new BigDecimal("70.0000"))
                .proposedPsrBank(new BigDecimal("40.0000"))
                .changeReason("PRODUCT_REPRICING")
                .effectiveDate(LocalDate.now().plusDays(7))
                .build();

        assertThatThrownBy(() -> service.initiateChangeRequest(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("PSR_SUM_INVALID");
                });
    }

    // -----------------------------------------------------------------------
    // PSR immutability tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Change PSR on term deposit is blocked with ST-006")
    void changePsr_onTermDeposit_blocked() {
        when(mudarabahAccountRepository.findById(2L)).thenReturn(Optional.of(termDepositAccount));

        InitiatePsrChangeRequest request = InitiatePsrChangeRequest.builder()
                .accountId(200L)
                .mudarabahAccountId(2L)
                .proposedPsrCustomer(new BigDecimal("75.0000"))
                .proposedPsrBank(new BigDecimal("25.0000"))
                .changeReason("PRODUCT_REPRICING")
                .effectiveDate(LocalDate.now().plusDays(7))
                .build();

        assertThatThrownBy(() -> service.initiateChangeRequest(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("PSR_IMMUTABLE_TD");
                });
    }

    @Test
    @DisplayName("Change PSR on savings creates a change request with DRAFT status requiring consent")
    void changePsr_onSavings_requiresConsent() {
        when(mudarabahAccountRepository.findById(1L)).thenReturn(Optional.of(savingsAccount));
        when(changeRequestRepository.save(any(PsrChangeRequest.class)))
                .thenAnswer(invocation -> {
                    PsrChangeRequest cr = invocation.getArgument(0);
                    cr.setId(50L);
                    return cr;
                });

        InitiatePsrChangeRequest request = InitiatePsrChangeRequest.builder()
                .accountId(100L)
                .mudarabahAccountId(1L)
                .proposedPsrCustomer(new BigDecimal("75.0000"))
                .proposedPsrBank(new BigDecimal("25.0000"))
                .changeReason("PRODUCT_REPRICING")
                .effectiveDate(LocalDate.now().plusDays(7))
                .build();

        var response = service.initiateChangeRequest(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("DRAFT");
        assertThat(response.isCustomerConsentRequired()).isTrue();
        assertThat(response.isCustomerConsentGiven()).isFalse();
        assertThat(response.getProposedPsrCustomer()).isEqualByComparingTo("75.0000");
        assertThat(response.getProposedPsrBank()).isEqualByComparingTo("25.0000");

        ArgumentCaptor<PsrChangeRequest> captor = ArgumentCaptor.forClass(PsrChangeRequest.class);
        verify(changeRequestRepository).save(captor.capture());
        PsrChangeRequest saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(PsrChangeStatus.DRAFT);
        assertThat(saved.isCustomerConsentRequired()).isTrue();
    }

    // -----------------------------------------------------------------------
    // Full lifecycle test
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("PSR change lifecycle: initiate -> consent -> approve -> apply")
    void psrChangeLifecycle_initiate_consent_approve_apply() {
        // Step 1: Initiate
        when(mudarabahAccountRepository.findById(1L)).thenReturn(Optional.of(savingsAccount));
        PsrChangeRequest changeRequest = PsrChangeRequest.builder()
                .id(50L)
                .accountId(100L)
                .mudarabahAccount(savingsAccount)
                .currentPsrCustomer(new BigDecimal("70.0000"))
                .currentPsrBank(new BigDecimal("30.0000"))
                .proposedPsrCustomer(new BigDecimal("75.0000"))
                .proposedPsrBank(new BigDecimal("25.0000"))
                .changeReason(PsrChangeReason.PRODUCT_REPRICING)
                .customerConsentRequired(true)
                .customerConsentGiven(false)
                .effectiveDate(LocalDate.now().plusDays(7))
                .status(PsrChangeStatus.DRAFT)
                .build();

        when(changeRequestRepository.save(any(PsrChangeRequest.class)))
                .thenAnswer(invocation -> {
                    PsrChangeRequest cr = invocation.getArgument(0);
                    if (cr.getId() == null) cr.setId(50L);
                    return cr;
                });

        InitiatePsrChangeRequest initRequest = InitiatePsrChangeRequest.builder()
                .accountId(100L)
                .mudarabahAccountId(1L)
                .proposedPsrCustomer(new BigDecimal("75.0000"))
                .proposedPsrBank(new BigDecimal("25.0000"))
                .changeReason("PRODUCT_REPRICING")
                .effectiveDate(LocalDate.now().plusDays(7))
                .build();

        var initResponse = service.initiateChangeRequest(initRequest);
        assertThat(initResponse.getStatus()).isEqualTo("DRAFT");

        // Step 2: Record consent
        when(changeRequestRepository.findById(50L)).thenReturn(Optional.of(changeRequest));
        CustomerConsentDetails consent = CustomerConsentDetails.builder()
                .consentMethod("ONLINE_ACCEPTANCE")
                .consentDate(LocalDateTime.now())
                .build();

        service.recordCustomerConsent(50L, consent);
        assertThat(changeRequest.isCustomerConsentGiven()).isTrue();
        assertThat(changeRequest.getStatus()).isEqualTo(PsrChangeStatus.CONSENT_GIVEN);

        // Step 3: Approve
        when(changeRequestRepository.findById(50L)).thenReturn(Optional.of(changeRequest));
        service.approvePsrChange(50L, "admin@bank.com");
        assertThat(changeRequest.getStatus()).isEqualTo(PsrChangeStatus.APPROVED);
        assertThat(changeRequest.getApprovedBy()).isEqualTo("admin@bank.com");

        // Step 4: Apply
        when(changeRequestRepository.findById(50L)).thenReturn(Optional.of(changeRequest));
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class))).thenReturn(savingsAccount);
        service.applyPsrChange(50L);

        assertThat(changeRequest.getStatus()).isEqualTo(PsrChangeStatus.APPLIED);
        assertThat(savingsAccount.getProfitSharingRatioCustomer()).isEqualByComparingTo("75.0000");
        assertThat(savingsAccount.getProfitSharingRatioBank()).isEqualByComparingTo("25.0000");
        assertThat(savingsAccount.getContractVersion()).isEqualTo(2);
        assertThat(savingsAccount.getPsrAgreedVersion()).isEqualTo(2);
    }

    @Test
    @DisplayName("PSR value over 100 is rejected as likely fixed amount (not a ratio)")
    void validatePsr_valueOver100_rejected() {
        assertThatThrownBy(() -> service.validatePsrIsRatioNotFixedAmount(
                new BigDecimal("500"), new BigDecimal("30")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("PSR_NOT_RATIO");
                });
    }
}
