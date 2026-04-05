package com.cbs.payments.islamic.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.customer.entity.Customer;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.repository.InstantPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentShariahAuditLogRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.shariahcompliance.dto.ShariahScreeningResultResponse;
import com.cbs.shariahcompliance.entity.ScreeningActionTaken;
import com.cbs.shariahcompliance.entity.ScreeningOverallResult;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.entity.ShariahExclusionListEntry;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import com.cbs.shariahcompliance.service.ShariahScreeningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentShariahScreeningServiceTest {

    @Mock private ShariahScreeningService shariahScreeningService;
    @Mock private ShariahExclusionListRepository exclusionListRepository;
    @Mock private ShariahExclusionListEntryRepository exclusionListEntryRepository;
    @Mock private PaymentInstructionRepository paymentInstructionRepository;
    @Mock private PaymentIslamicExtensionRepository paymentIslamicExtensionRepository;
    @Mock private PaymentShariahAuditLogRepository paymentShariahAuditLogRepository;
    @Mock private InstantPaymentExtensionRepository instantPaymentExtensionRepository;
    @Mock private IslamicPaymentSupport paymentSupport;

    @InjectMocks
    private PaymentShariahScreeningService service;

    private Account sourceAccount;

    @BeforeEach
    void setUp() {
        sourceAccount = Account.builder()
                .id(1L)
                .accountNumber("1000000001")
                .customer(Customer.builder().id(77L).build())
                .product(Product.builder().code("WAD-SAR-001").build())
                .currencyCode("SAR")
                .build();

        lenient().when(paymentSupport.normalize(anyString())).thenAnswer(invocation ->
                invocation.getArgument(0, String.class).toLowerCase());
        lenient().when(paymentSupport.fuzzyMatch(anyString(), anyString())).thenAnswer(invocation -> {
            String left = invocation.getArgument(0, String.class).toLowerCase();
            String right = invocation.getArgument(1, String.class).toLowerCase();
            return left.contains(right) || right.contains(left);
        });
        lenient().when(shariahScreeningService.preScreenTransaction(any())).thenReturn(basePassResult());
        lenient().when(shariahScreeningService.screenTransaction(any())).thenReturn(basePassResult());
    }

    @Test
    void previewScreening_haramMcc_blocked() {
        mockList("HARAM_MCC", 1L, List.of());
        when(exclusionListEntryRepository.existsByListIdAndEntryValueAndStatus(anyLong(), anyString(), eq("ACTIVE")))
                .thenAnswer(invocation -> Long.valueOf(1L).equals(invocation.getArgument(0, Long.class))
                        && "5813".equals(invocation.getArgument(1, String.class)));

        IslamicPaymentResponses.PaymentScreeningResult result = service.previewScreening(
                requestWith("5813", "Clean Supplier", "Supplier settlement"),
                sourceAccount,
                new IslamicPaymentSupport.SourceAccountProfile(true, "WADIAH", "WAD-SAR-001", null, true)
        );

        assertThat(result.getOutcome()).isEqualTo(IslamicPaymentDomainEnums.ScreeningOutcome.BLOCKED);
        assertThat(result.getBlockReason()).contains("MCC 5813");
    }

    @Test
    void previewScreening_cleanBeneficiary_passes() {
        mockList("HARAM_MCC", 1L, List.of());
        mockList("PROHIBITED_COUNTERPARTIES", 2L, List.of());
        mockList("PROHIBITED_BANKS", 3L, List.of());
        mockList("PROHIBITED_PAYMENT_PURPOSES", 4L, List.of());

        IslamicPaymentResponses.PaymentScreeningResult result = service.previewScreening(
                requestWith("5411", "Clean Supplier", "Monthly grocery"),
                sourceAccount,
                new IslamicPaymentSupport.SourceAccountProfile(true, "WADIAH", "WAD-SAR-001", null, true)
        );

        assertThat(result.getOutcome()).isEqualTo(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED);
        assertThat(result.getOverallResult()).isEqualTo(IslamicPaymentDomainEnums.PaymentScreeningResult.PASS);
    }

    @Test
    void previewScreening_counterpartyFuzzyMatch_alerted() {
        mockList("HARAM_MCC", 1L, List.of());
        mockList("PROHIBITED_COUNTERPARTIES", 2L, List.of(
                ShariahExclusionListEntry.builder().listId(2L).entryValue("Casino Royale LLC").status("ACTIVE").build()
        ));
        mockList("PROHIBITED_BANKS", 3L, List.of());
        mockList("PROHIBITED_PAYMENT_PURPOSES", 4L, List.of());

        IslamicPaymentResponses.PaymentScreeningResult result = service.previewScreening(
                requestWith("5411", "Casino Royale", "Supplier transfer"),
                sourceAccount,
                new IslamicPaymentSupport.SourceAccountProfile(true, "WADIAH", "WAD-SAR-001", null, true)
        );

        assertThat(result.getOutcome()).isEqualTo(IslamicPaymentDomainEnums.ScreeningOutcome.ALLOWED_WITH_ALERT);
        assertThat(result.getCheckResults()).anyMatch(check ->
                check.getCheckType() == IslamicPaymentDomainEnums.CheckType.COUNTERPARTY
                        && check.getResult() == IslamicPaymentDomainEnums.CheckResult.ALERT);
    }

    private IslamicPaymentRequests.IslamicPaymentRequest requestWith(String merchantCategoryCode,
                                                                     String beneficiaryName,
                                                                     String purposeDescription) {
        return IslamicPaymentRequests.IslamicPaymentRequest.builder()
                .sourceAccountId(1L)
                .destinationAccountNumber("2000000001")
                .destinationBankCode("BANK1")
                .destinationBankSwift("BANK1SWF")
                .beneficiaryName(beneficiaryName)
                .beneficiaryBankName("Beneficiary Bank")
                .amount(new BigDecimal("5000.00"))
                .currencyCode("SAR")
                .paymentChannel("ACH")
                .purpose(IslamicPaymentDomainEnums.PaymentPurpose.SUPPLIER_PAYMENT)
                .purposeDescription(purposeDescription)
                .reference("PAY-REF-1")
                .requireShariahScreening(true)
                .merchantCategoryCode(merchantCategoryCode)
                .build();
    }

    private void mockList(String listCode, Long listId, List<ShariahExclusionListEntry> entries) {
        lenient().when(exclusionListRepository.findByListCode(listCode)).thenReturn(Optional.of(
                ShariahExclusionList.builder()
                        .id(listId)
                        .listCode(listCode)
                        .status("ACTIVE")
                        .build()
        ));
        lenient().when(exclusionListEntryRepository.findByListIdAndStatus(listId, "ACTIVE")).thenReturn(entries);
    }

    private ShariahScreeningResultResponse basePassResult() {
        return ShariahScreeningResultResponse.builder()
                .screeningRef("SSR-2026-000001")
                .overallResult(ScreeningOverallResult.PASS)
                .actionTaken(ScreeningActionTaken.ALLOWED)
                .screenedAt(LocalDateTime.now())
                .processingTimeMs(12L)
                .build();
    }
}
