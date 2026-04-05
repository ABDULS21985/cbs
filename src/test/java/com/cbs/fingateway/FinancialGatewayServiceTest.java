package com.cbs.fingateway;

import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.common.exception.BusinessException;
import com.cbs.fingateway.entity.*;
import com.cbs.fingateway.repository.*;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinancialGatewayServiceTest {

    @Mock private FinancialGatewayRepository gatewayRepository;
    @Mock private GatewayMessageRepository messageRepository;
    @Mock private SanctionsScreeningService sanctionsScreeningService;
    @Mock private RestTemplate restTemplate;
    @InjectMocks private FinancialGatewayService service;

    @BeforeEach
    void setUp() {
        SyntheticCapabilityGuard.enableSyntheticServicesForTesting();
    }

    @Test @DisplayName("Message sent through connected gateway with sanctions check")
    void sendMessage() {
        FinancialGateway gw = FinancialGateway.builder().id(1L).gatewayCode("SWIFT-1")
                .connectionStatus("CONNECTED").messagesToday(0).valueToday(BigDecimal.ZERO).build();
        when(gatewayRepository.findById(1L)).thenReturn(Optional.of(gw));
        when(gatewayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any())).thenAnswer(inv -> { GatewayMessage m = inv.getArgument(0); m.setId(1L); return m; });
        when(sanctionsScreeningService.screenName(anyString(), anyString(), anyString(),
                any(), any(), any(), any(), anyString(), any(), any()))
                .thenReturn(ScreeningRequest.builder().status("CLEAR").totalMatches(0).build());

        GatewayMessage msg = GatewayMessage.builder().gatewayId(1L).direction("OUTBOUND")
                .messageType("pacs.008").messageFormat("MX").amount(new BigDecimal("50000")).currency("USD").build();
        GatewayMessage result = service.sendMessage(msg);

        assertThat(result.getMessageRef()).startsWith("GW-");
        assertThat(result.getDeliveryStatus()).isEqualTo("PENDING");
        assertThat(result.getSanctionsChecked()).isTrue();
        assertThat(result.getSanctionsResult()).isEqualTo("CLEAR");
        assertThat(gw.getMessagesToday()).isEqualTo(1);
    }

    @Test @DisplayName("Disconnected gateway rejects message")
    void disconnectedGateway() {
        FinancialGateway gw = FinancialGateway.builder().id(1L).gatewayCode("SWIFT-DOWN")
                .connectionStatus("DISCONNECTED").build();
        when(gatewayRepository.findById(1L)).thenReturn(Optional.of(gw));

        GatewayMessage msg = GatewayMessage.builder().gatewayId(1L).direction("OUTBOUND").messageType("MT103").messageFormat("MT").build();
        assertThatThrownBy(() -> service.sendMessage(msg))
                .isInstanceOf(BusinessException.class).hasMessageContaining("not connected");
    }

    @Test @DisplayName("ACK updates delivery status and records reference")
    void acknowledgeMessage() {
        GatewayMessage msg = GatewayMessage.builder().id(1L).messageRef("GW-ACK-TEST").deliveryStatus("SENT").build();
        when(messageRepository.findByMessageRef("GW-ACK-TEST")).thenReturn(Optional.of(msg));
        when(messageRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        GatewayMessage result = service.acknowledgeMessage("GW-ACK-TEST", "SWIFT-ACK-12345");
        assertThat(result.getDeliveryStatus()).isEqualTo("ACKNOWLEDGED");
        assertThat(result.getAckReference()).isEqualTo("SWIFT-ACK-12345");
    }
}
