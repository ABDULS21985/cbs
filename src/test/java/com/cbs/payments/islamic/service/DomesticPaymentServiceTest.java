package com.cbs.payments.islamic.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.islamic.dto.IslamicPaymentResponses;
import com.cbs.payments.islamic.entity.DomesticPaymentConfig;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import com.cbs.payments.islamic.repository.DomesticPaymentConfigRepository;
import com.cbs.payments.islamic.repository.DomesticPaymentMessageRepository;
import com.cbs.payments.islamic.repository.PaymentIslamicExtensionRepository;
import com.cbs.payments.repository.PaymentInstructionRepository;
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
class DomesticPaymentServiceTest {

    @Mock private DomesticPaymentConfigRepository configRepository;
    @Mock private DomesticPaymentMessageRepository messageRepository;
    @Mock private PaymentInstructionRepository paymentInstructionRepository;
    @Mock private PaymentIslamicExtensionRepository extensionRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private IslamicPaymentSupport paymentSupport;

    @InjectMocks
    private DomesticPaymentService service;

    @Test
    void processDomesticPayment_sarRoutesToSarie() {
        PaymentInstruction payment = PaymentInstruction.builder()
                .id(10L)
                .instructionRef("PAY00010")
                .paymentType(PaymentType.DOMESTIC_BATCH)
                .paymentRail("RTGS")
                .amount(new BigDecimal("100000.00"))
                .currencyCode("SAR")
                .build();
        PaymentIslamicExtension extension = PaymentIslamicExtension.builder()
                .paymentId(10L)
                .shariahScreened(true)
                .islamicTransactionCode("GENERAL")
                .build();
        DomesticPaymentConfig config = DomesticPaymentConfig.builder()
                .id(3L)
                .countryCode("SA")
                .railName("SARIE")
                .railType(IslamicPaymentDomainEnums.RailType.RTGS)
                .operatingHoursStart("00:00")
                .operatingHoursEnd("23:59")
                .operatingDays(List.of(LocalDate.now().getDayOfWeek().name()))
                .currencyCode("SAR")
                .messageFormat(IslamicPaymentDomainEnums.MessageFormat.ISO_20022)
                .active(true)
                .build();

        when(paymentInstructionRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(extensionRepository.findByPaymentId(10L)).thenReturn(Optional.of(extension));
        when(configRepository.findByCountryCodeAndRailTypeAndActiveTrue("SA", IslamicPaymentDomainEnums.RailType.RTGS))
                .thenReturn(Optional.of(config));
        when(hijriCalendarService.isIslamicBusinessDay(LocalDate.now())).thenReturn(true);
        when(messageRepository.findByPaymentId(10L)).thenReturn(Optional.empty());
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentSupport.currentTenantId()).thenReturn(1L);
        when(paymentSupport.nextMessageRef("DPM", 10L)).thenReturn("DPM-2026-000010");
        when(paymentSupport.uppercase(any())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });

        IslamicPaymentResponses.DomesticPaymentResult result = service.processDomesticPayment(10L);

        assertThat(result.getRailName()).isEqualTo("SARIE");
        assertThat(result.getStatus()).isEqualTo("SUBMITTED");
        assertThat(result.getMessageRef()).isEqualTo("DPM-2026-000010");
    }

    @Test
    void processDomesticPayment_withoutScreeningRejected() {
        PaymentInstruction payment = PaymentInstruction.builder()
                .id(10L)
                .instructionRef("PAY00010")
                .paymentType(PaymentType.DOMESTIC_BATCH)
                .paymentRail("ACH")
                .amount(new BigDecimal("1000.00"))
                .currencyCode("SAR")
                .build();
        PaymentIslamicExtension extension = PaymentIslamicExtension.builder()
                .paymentId(10L)
                .shariahScreened(false)
                .build();
        DomesticPaymentConfig config = DomesticPaymentConfig.builder()
                .id(4L)
                .countryCode("SA")
                .railName("SADAD")
                .railType(IslamicPaymentDomainEnums.RailType.ACH)
                .currencyCode("SAR")
                .messageFormat(IslamicPaymentDomainEnums.MessageFormat.PROPRIETARY)
                .active(true)
                .build();

        when(paymentInstructionRepository.findById(10L)).thenReturn(Optional.of(payment));
        when(extensionRepository.findByPaymentId(10L)).thenReturn(Optional.of(extension));
        when(configRepository.findByCountryCodeAndRailTypeAndActiveTrue("SA", IslamicPaymentDomainEnums.RailType.ACH))
                .thenReturn(Optional.of(config));
        when(paymentSupport.uppercase(any())).thenAnswer(invocation -> {
            String value = invocation.getArgument(0, String.class);
            return value == null ? null : value.toUpperCase();
        });

        assertThatThrownBy(() -> service.processDomesticPayment(10L))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("PAYMENT_NOT_SCREENED");
    }
}
