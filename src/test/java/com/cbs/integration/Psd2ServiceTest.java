package com.cbs.integration;

import com.cbs.common.exception.BusinessException;
import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import com.cbs.integration.service.Psd2Service;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Psd2ServiceTest {

    @Mock private Psd2TppRegistrationRepository tppRepository;
    @Mock private Psd2ScaSessionRepository scaRepository;
    @InjectMocks private Psd2Service psd2Service;

    @Test
    @DisplayName("Low-value payment (< EUR 30) gets SCA exemption")
    void lowValueExemption() {
        Psd2TppRegistration tpp = Psd2TppRegistration.builder().tppId("TPP-001").status("ACTIVE").build();
        when(tppRepository.findByTppId("TPP-001")).thenReturn(Optional.of(tpp));
        when(scaRepository.save(any())).thenAnswer(inv -> { Psd2ScaSession s = inv.getArgument(0); s.setId(1L); return s; });

        Psd2ScaSession result = psd2Service.initiateSca("TPP-001", 100L, "SMS_OTP", null, null,
                new BigDecimal("15.00"), "1.2.3.4", "Chrome");

        assertThat(result.getScaStatus()).isEqualTo("EXEMPTED");
        assertThat(result.getExemptionType()).isEqualTo("LOW_VALUE");
        assertThat(result.getFinalisedAt()).isNotNull();
    }

    @Test
    @DisplayName("High-value payment requires full SCA")
    void highValueRequiresSca() {
        Psd2TppRegistration tpp = Psd2TppRegistration.builder().tppId("TPP-001").status("ACTIVE").build();
        when(tppRepository.findByTppId("TPP-001")).thenReturn(Optional.of(tpp));
        when(scaRepository.save(any())).thenAnswer(inv -> { Psd2ScaSession s = inv.getArgument(0); s.setId(1L); return s; });

        Psd2ScaSession result = psd2Service.initiateSca("TPP-001", 100L, "FIDO2", null, null,
                new BigDecimal("5000.00"), "1.2.3.4", "Chrome");

        assertThat(result.getScaStatus()).isEqualTo("AUTHENTICATION_REQUIRED");
        assertThat(result.getExemptionType()).isNull();
    }

    @Test
    @DisplayName("Cannot activate TPP without eIDAS certificate")
    void activateWithoutCertFails() {
        Psd2TppRegistration tpp = Psd2TppRegistration.builder().tppId("TPP-NO-CERT").status("PENDING").build();
        when(tppRepository.findByTppId("TPP-NO-CERT")).thenReturn(Optional.of(tpp));

        assertThatThrownBy(() -> psd2Service.activateTpp("TPP-NO-CERT"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("eIDAS");
    }

    @Test
    @DisplayName("Expired SCA session cannot be finalised")
    void expiredScaSession() {
        Psd2ScaSession expired = Psd2ScaSession.builder().id(1L).sessionId("SCA-EXPIRED")
                .scaStatus("AUTHENTICATION_REQUIRED")
                .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES)).build();
        when(scaRepository.findBySessionId("SCA-EXPIRED")).thenReturn(Optional.of(expired));
        when(scaRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> psd2Service.finaliseSca("SCA-EXPIRED", true))
                .isInstanceOf(BusinessException.class).hasMessageContaining("expired");
    }
}
