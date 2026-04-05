package com.cbs.integration;

import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.fingateway.entity.FinancialGateway;
import com.cbs.fingateway.entity.GatewayMessage;
import com.cbs.fingateway.repository.FinancialGatewayRepository;
import com.cbs.fingateway.repository.GatewayMessageRepository;
import com.cbs.fingateway.service.FinancialGatewayService;
import com.cbs.sanctions.service.SanctionsScreeningService;
import com.cbs.sanctions.entity.ScreeningRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SwiftMessageTest {

    @Mock
    private FinancialGatewayRepository gatewayRepository;
    @Mock
    private GatewayMessageRepository messageRepository;
    @Mock
    private SanctionsScreeningService sanctionsScreeningService;
    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private FinancialGatewayService financialGatewayService;

    @BeforeEach
    void setUp() {
        SyntheticCapabilityGuard.enableSyntheticServicesForTesting();
    }

    @Test
    @DisplayName("MT103 single customer credit transfer format is valid")
    void swiftMt103Format() {
        String message = financialGatewayService.buildMt103(
                new FinancialGatewayService.SwiftTransferDetails(
                        "REF123456789",
                        LocalDate.of(2026, 3, 18),
                        "USD",
                        new BigDecimal("1500.25"),
                        "1234567890",
                        "JOHN DOE",
                        "0987654321",
                        "JANE DOE",
                        "Invoice settlement",
                        "SHA",
                        "CHASUS33",
                        "BNPAFRPP"
                )
        );

        assertThat(message).contains(":20:");
        assertThat(message).contains(":23B:CRED");
        assertThat(message).contains(":32A:");
        assertThat(message).contains(":50K:");
        assertThat(message).contains(":53A:CHASUS33");
        assertThat(message).contains(":57A:BNPAFRPP");
        assertThat(message).contains(":59:");
        assertThat(message).matches("(?s).*:71A:(OUR|BEN|SHA).*");
    }

    @Test
    @DisplayName("MT103 amount uses SWIFT comma decimal format")
    void swiftAmountFormatting() {
        String message = financialGatewayService.buildMt103(
                new FinancialGatewayService.SwiftTransferDetails(
                        "REF-AMOUNT-001",
                        LocalDate.of(2026, 3, 18),
                        "NGN",
                        new BigDecimal("100000.50"),
                        "1234567890",
                        "ORDERING CUSTOMER",
                        "0987654321",
                        "BENEFICIARY CUSTOMER",
                        "Remittance",
                        "OUR",
                        null,
                        null
                )
        );

        assertThat(message).contains(":32A:260318NGN100000,50");
    }

    @Test
    @DisplayName("Gateway send keeps SWIFT delivery contract fields populated")
    void sendSwiftMessage() {
        FinancialGateway gateway = FinancialGateway.builder()
                .id(1L)
                .gatewayCode("SWIFT-1")
                .connectionStatus("CONNECTED")
                .messagesToday(0)
                .valueToday(BigDecimal.ZERO)
                .build();
        when(gatewayRepository.findById(1L)).thenReturn(Optional.of(gateway));
        when(gatewayRepository.save(any(FinancialGateway.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.save(any(GatewayMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock sanctions screening to return CLEAR
        ScreeningRequest clearResult = ScreeningRequest.builder()
                .status("CLEAR").totalMatches(0).build();
        when(sanctionsScreeningService.screenName(
                anyString(), anyString(), anyString(),
                any(), any(), any(), any(), anyString(), any(), any()
        )).thenReturn(clearResult);

        GatewayMessage result = financialGatewayService.sendMessage(
                GatewayMessage.builder()
                        .gatewayId(1L)
                        .direction("OUTBOUND")
                        .messageType("MT103")
                        .messageFormat("MT")
                        .amount(new BigDecimal("50000"))
                        .currency("USD")
                        .build()
        );

        assertThat(result.getMessageRef()).startsWith("GW-");
        // No endpoint URL configured, so message stays PENDING for retry
        assertThat(result.getDeliveryStatus()).isEqualTo("PENDING");
        assertThat(result.getSanctionsChecked()).isTrue();
        assertThat(result.getSanctionsResult()).isEqualTo("CLEAR");
    }
}
