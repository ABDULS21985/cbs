package com.cbs.payments.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.fees.islamic.service.IslamicFeeService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentStatus;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentShariahAuditLog;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.payments.service.PaymentService;
import com.cbs.standing.entity.InstructionType;
import com.cbs.standing.entity.StandingInstruction;
import com.cbs.standing.repository.StandingInstructionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IslamicPaymentServiceTest {

    @Mock private PaymentService paymentService;
    @Mock private AccountRepository accountRepository;
    @Mock private PaymentInstructionRepository paymentInstructionRepository;
    @Mock private PaymentIslamicExtensionRepository extensionRepository;
    @Mock private PaymentShariahAuditLogRepository auditLogRepository;
    @Mock private StandingInstructionRepository standingInstructionRepository;
    @Mock private PaymentShariahScreeningService screeningService;
    @Mock private IslamicFeeService islamicFeeService;
    @Mock private DomesticPaymentService domesticPaymentService;
    @Mock private CrossBorderPaymentService crossBorderPaymentService;
    @Mock private InstantPaymentService instantPaymentService;
    @Mock private IslamicPaymentSupport paymentSupport;

    @InjectMocks
    private IslamicPaymentService service;

    private Account sourceAccount;
    private Account creditAccount;

    @BeforeEach
    void setUp() {
        sourceAccount = Account.builder()
                .id(1L)
                .accountNumber("1000000001")
                .currencyCode("SAR")
                .availableBalance(new BigDecimal("50000.00"))
                .product(Product.builder().code("WAD-SAR-001").build())
                .build();
        creditAccount = Account.builder()
                .id(2L)
                .accountNumber("2000000001")
                .currencyCode("SAR")
                .build();

        when(paymentSupport.loadSourceAccount(1L)).thenReturn(sourceAccount);
        when(paymentSupport.resolveSourceProfile(sourceAccount)).thenReturn(
                new IslamicPaymentSupport.SourceAccountProfile(true, "WADIAH", "WAD-SAR-001", null, true)
        );
        when(paymentSupport.currentTenantId()).thenReturn(1L);
        when(paymentSupport.currentActor()).thenReturn("officer.user");
        when(paymentSupport.resolvePurposeFlag(any(), any())).thenReturn(IslamicPaymentDomainEnums.ShariahPurposeFlag.COMPLIANT);
        when(paymentSupport.resolveCountryCode(any())).thenReturn("SA");
        when(paymentInstructionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(extensionRepository.findByPaymentId(any())).thenReturn(Optional.empty());
        when(extensionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(screeningService.persistAuditLog(any(), any(), any(), any(), any())).thenReturn(
                PaymentShariahAuditLog.builder().id(1L).build()
        );
        when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(creditAccount));
    }

    @Test
    void initiatePayment_fromIslamicAccountWithoutScreeningRejected() {
        IslamicPaymentRequests.IslamicPaymentRequest request = baseRequest();
        request.setRequireShariahScreening(false);

        assertThatThrownBy(() -> service.initiatePayment(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-PAY-001");
    }

    @Test
    void initiatePaymentWithOverride_alertAllowedWithAuditTrail() {
        IslamicPaymentRequests.IslamicPaymentRequest request = baseRequest();
        when(screeningService.screenForExecution(any(), any(), any())).thenReturn(
                IslamicPaymentResponses.PaymentScreeningResult.builder()
                        .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT)
                        .overallResult(IslamicPaymentDomainEnums.PaymentScreeningResult.ALERT)
                        .screeningRef("SSR-1")
                        .screeningDurationMs(15L)
                        .build()
        );
        PaymentInstruction payment = PaymentInstruction.builder()
                .id(99L)
                .instructionRef("PAY000000000000099")
                .paymentType(PaymentType.INTERNAL_TRANSFER)
                .status(PaymentStatus.COMPLETED)
                .build();
        when(paymentService.executeInternalTransfer(1L, 2L, new BigDecimal("5000.00"), "Islamic internal transfer"))
                .thenReturn(payment);

        IslamicPaymentResponses.PaymentResponse response = service.initiatePaymentWithOverride(
                request,
                IslamicPaymentRequests.ManualOverrideRequest.builder()
                        .reason("Alert accepted after review")
                        .approvedBy("manager.user")
                        .build(),
                false
        );

        assertThat(response.getPaymentId()).isEqualTo(99L);
        assertThat(response.getScreeningResult().getOutcome()).isEqualTo(IslamicPaymentDomainEnums.ScreeningOutcome.MANUAL_OVERRIDE);
        assertThat(response.getMessage()).contains("manual override");
    }

    @Test
    void initiatePaymentWithOverride_blockWithoutComplianceRejected() {
        when(screeningService.screenForExecution(any(), any(), any())).thenReturn(
                IslamicPaymentResponses.PaymentScreeningResult.builder()
                        .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED)
                        .overallResult(IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL)
                        .screeningRef("SSR-2")
                        .blockReason("Blocked by MCC rule")
                        .build()
        );

        assertThatThrownBy(() -> service.initiatePaymentWithOverride(
                baseRequest(),
                IslamicPaymentRequests.ManualOverrideRequest.builder()
                        .reason("Attempted override")
                        .approvedBy("manager.user")
                        .build(),
                false
        ))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("PAYMENT_BLOCK_OVERRIDE_FORBIDDEN");
    }

    @Test
    void screenStandingOrderBatch_returnsBlockedPreview() {
        StandingInstruction instruction = StandingInstruction.builder()
                .id(7L)
                .instructionRef("SI0000000000007")
                .instructionType(InstructionType.STANDING_ORDER)
                .debitAccount(sourceAccount)
                .creditAccountNumber("2000000001")
                .creditAccountName("Casino Royale LLC")
                .creditBankCode("BANK1")
                .amount(new BigDecimal("7500.00"))
                .currencyCode("SAR")
                .frequency("MONTHLY")
                .nextExecutionDate(LocalDate.of(2026, 4, 5))
                .build();
        when(standingInstructionRepository.findDueForExecution(LocalDate.of(2026, 4, 5))).thenReturn(List.of(instruction));
        when(screeningService.previewScreening(any(), any(), any())).thenReturn(
                IslamicPaymentResponses.PaymentScreeningResult.builder()
                        .outcome(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED)
                        .overallResult(IslamicPaymentDomainEnums.PaymentScreeningResult.FAIL)
                        .screeningRef("SSR-STAND-1")
                        .blockReason("Counterparty blocked")
                        .build()
        );

        List<IslamicPaymentResponses.PaymentScreeningPreview> previews = service.screenStandingOrderBatch(LocalDate.of(2026, 4, 5));

        assertThat(previews).hasSize(1);
        assertThat(previews.getFirst().getOutcome()).isEqualTo(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED);
        assertThat(previews.getFirst().getInstructionRef()).isEqualTo("SI0000000000007");
    }

    private IslamicPaymentRequests.IslamicPaymentRequest baseRequest() {
        return IslamicPaymentRequests.IslamicPaymentRequest.builder()
                .sourceAccountId(1L)
                .destinationAccountNumber("2000000001")
                .beneficiaryName("Internal Beneficiary")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .paymentChannel("INTERNAL")
                .purpose(IslamicPaymentDomainEnums.PaymentPurpose.INTRA_BANK_TRANSFER)
                .purposeDescription("Islamic internal transfer")
                .reference("Islamic internal transfer")
                .requireShariahScreening(true)
                .build();
    }
}
