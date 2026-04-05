package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.islamic.dto.IslamicPaymentRequests;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.repository.CrossBorderPaymentExtensionRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.repository.BankDirectoryRepository;
import com.cbs.payments.repository.FxRateRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.shariahcompliance.entity.ShariahExclusionList;
import com.cbs.shariahcompliance.repository.ShariahExclusionListEntryRepository;
import com.cbs.shariahcompliance.repository.ShariahExclusionListRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrossBorderPaymentServiceTest {

    @Mock private CrossBorderPaymentExtensionRepository extensionRepository;
    @Mock private PaymentInstructionRepository paymentInstructionRepository;
    @Mock private PaymentIslamicExtensionRepository paymentIslamicExtensionRepository;
    @Mock private FxRateRepository fxRateRepository;
    @Mock private BankDirectoryRepository bankDirectoryRepository;
    @Mock private ShariahExclusionListRepository exclusionListRepository;
    @Mock private ShariahExclusionListEntryRepository exclusionListEntryRepository;
    @Mock private com.cbs.fingateway.service.FinancialGatewayService financialGatewayService;
    @Mock private IslamicPaymentSupport paymentSupport;

    @InjectMocks
    private CrossBorderPaymentService service;

    @Test
    void processCrossBorderPayment_buildsField72Narrative() {
        PaymentInstruction payment = PaymentInstruction.builder()
                .id(11L)
                .instructionRef("SWF00011")
                .swiftUetr("uetr-123")
                .swiftMessageType("MT103")
                .beneficiaryBankCode("BANKSWF1")
                .beneficiaryBankName("Beneficiary Bank")
                .currencyCode("USD")
                .fxTargetCurrency("USD")
                .amount(new BigDecimal("2500.00"))
                .chargeType("SHA")
                .chargeAmount(BigDecimal.ZERO)
                .build();
        PaymentIslamicExtension extension = PaymentIslamicExtension.builder()
                .paymentId(11L)
                .shariahScreened(true)
                .islamicTransactionCode("MURABAHA_REPAYMENT")
                .build();

        when(extensionRepository.findByPaymentId(11L)).thenReturn(Optional.empty());
        when(extensionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentSupport.currentTenantId()).thenReturn(1L);
        when(paymentSupport.uppercase(any())).thenAnswer(invocation -> invocation.getArgument(0, String.class).toUpperCase());
        when(paymentSupport.resolveCountryCode(any())).thenReturn("US");
        when(exclusionListRepository.findByListCode("SANCTIONED_COUNTRIES")).thenReturn(Optional.empty());
        when(exclusionListRepository.findByListCode("PROHIBITED_BANKS")).thenReturn(Optional.empty());

        IslamicPaymentResponses.CrossBorderPaymentResult result = service.processCrossBorderPayment(
                payment,
                extension,
                IslamicPaymentRequests.IslamicPaymentRequest.builder()
                        .destinationBankSwift("BANKSWF1")
                        .beneficiaryBankName("Beneficiary Bank")
                        .currencyCode("USD")
                        .destinationCurrencyCode("USD")
                        .build()
        );

        assertThat(result.getField72Narrative()).contains("/ISLM/SHARIAH_COMPLIANT");
        assertThat(result.getField72Narrative()).contains("/PURP/MURABAHA_REPAYMENT");
    }

    @Test
    void processCrossBorderPayment_prohibitedBeneficiaryBankBlocked() {
        PaymentInstruction payment = PaymentInstruction.builder()
                .id(12L)
                .instructionRef("SWF00012")
                .beneficiaryBankCode("RIBAINTX")
                .beneficiaryBankName("Restricted Bank")
                .currencyCode("USD")
                .fxTargetCurrency("USD")
                .amount(new BigDecimal("1500.00"))
                .chargeType("SHA")
                .chargeAmount(BigDecimal.ZERO)
                .build();
        PaymentIslamicExtension extension = PaymentIslamicExtension.builder()
                .paymentId(12L)
                .shariahScreened(true)
                .islamicTransactionCode("GENERAL")
                .build();

        when(paymentInstructionRepository.findById(12L)).thenReturn(Optional.of(payment));
        when(paymentIslamicExtensionRepository.findByPaymentId(12L)).thenReturn(Optional.of(extension));
        when(exclusionListRepository.findByListCode("SANCTIONED_COUNTRIES")).thenReturn(Optional.empty());
        when(exclusionListRepository.findByListCode("PROHIBITED_BANKS")).thenReturn(Optional.of(
                ShariahExclusionList.builder().id(9L).listCode("PROHIBITED_BANKS").build()
        ));
        when(exclusionListEntryRepository.existsByListIdAndEntryValueAndStatus(9L, "RIBAINTX", "ACTIVE")).thenReturn(true);

        assertThatThrownBy(() -> service.processCrossBorderPayment(12L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH-PAY-PROHIBITED-BANK");
    }
}
