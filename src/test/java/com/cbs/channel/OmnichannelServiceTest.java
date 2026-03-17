package com.cbs.channel;

import com.cbs.channel.entity.*;
import com.cbs.channel.repository.*;
import com.cbs.channel.service.OmnichannelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OmnichannelServiceTest {

    @Mock private ChannelSessionRepository sessionRepository;
    @Mock private ChannelConfigRepository configRepository;

    @InjectMocks private OmnichannelService omnichannelService;

    @Test
    @DisplayName("Should create session with channel-specific timeout")
    void createSession_WithTimeout() {
        ChannelConfig config = ChannelConfig.builder().channel("USSD").isEnabled(true).sessionTimeoutSecs(180).build();
        when(configRepository.findByChannel("USSD")).thenReturn(Optional.of(config));
        when(sessionRepository.save(any())).thenAnswer(inv -> { ChannelSession s = inv.getArgument(0); s.setId(1L); return s; });

        ChannelSession result = omnichannelService.createSession("USSD", 1L, null, null, null, null);

        assertThat(result.getChannel()).isEqualTo("USSD");
        assertThat(result.getTimeoutSeconds()).isEqualTo(180);
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Should hand off session from USSD to MOBILE with context preservation")
    void handoffSession_PreservesContext() {
        ChannelSession source = ChannelSession.builder()
                .id(1L).sessionId("SES-SOURCE001").channel("USSD").customerId(100L)
                .status("ACTIVE").contextData(java.util.Map.of("amount", "5000", "recipient", "1234567890"))
                .timeoutSeconds(180).lastActivityAt(Instant.now()).build();

        when(sessionRepository.findBySessionId("SES-SOURCE001")).thenReturn(Optional.of(source));
        when(configRepository.findByChannel("MOBILE")).thenReturn(Optional.empty());
        when(sessionRepository.save(any())).thenAnswer(inv -> { ChannelSession s = inv.getArgument(0); if (s.getId() == null) s.setId(2L); return s; });

        ChannelSession target = omnichannelService.handoffSession("SES-SOURCE001", "MOBILE", "iPhone15", "192.168.1.1");

        assertThat(source.getStatus()).isEqualTo("HANDED_OFF");
        assertThat(target.getChannel()).isEqualTo("MOBILE");
        assertThat(target.getParentSessionId()).isEqualTo("SES-SOURCE001");
        assertThat(target.getHandoffFromChannel()).isEqualTo("USSD");
        assertThat(target.getContextData()).containsEntry("amount", "5000");
        assertThat(target.getContextData()).containsEntry("recipient", "1234567890");
    }
}
