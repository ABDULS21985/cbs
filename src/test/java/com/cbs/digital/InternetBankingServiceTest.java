package com.cbs.digital;

import com.cbs.common.exception.BusinessException;
import com.cbs.digital.entity.*;
import com.cbs.digital.repository.*;
import com.cbs.digital.service.InternetBankingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InternetBankingServiceTest {

    @Mock private InternetBankingSessionRepository sessionRepository;
    @Mock private InternetBankingFeatureRepository featureRepository;
    @InjectMocks private InternetBankingService service;

    @Test
    @DisplayName("Login creates ACTIVE session with generated session ID")
    void loginCreatesSession() {
        when(sessionRepository.save(any())).thenAnswer(inv -> { InternetBankingSession s = inv.getArgument(0); s.setId(1L); return s; });

        InternetBankingSession session = service.login(100L, "PASSWORD", "fp-abc", "1.2.3.4", "Chrome");
        assertThat(session.getSessionId()).startsWith("IBS-");
        assertThat(session.getSessionStatus()).isEqualTo("ACTIVE");
        assertThat(session.getMfaCompleted()).isFalse();
    }

    @Test
    @DisplayName("MFA-required feature blocked without MFA completion")
    void mfaGating() {
        InternetBankingSession session = InternetBankingSession.builder()
                .sessionId("IBS-TEST").customerId(100L).sessionStatus("ACTIVE").mfaCompleted(false).build();
        InternetBankingFeature payFeature = InternetBankingFeature.builder()
                .featureCode("IB-PAY-DOMESTIC").requiresMfa(true).isEnabled(true).build();

        when(sessionRepository.findBySessionId("IBS-TEST")).thenReturn(Optional.of(session));
        when(featureRepository.findByFeatureCode("IB-PAY-DOMESTIC")).thenReturn(Optional.of(payFeature));

        boolean canAccess = service.canAccessFeature("IBS-TEST", "IB-PAY-DOMESTIC");
        assertThat(canAccess).isFalse();
    }

    @Test
    @DisplayName("MFA-required feature accessible after MFA completion")
    void mfaCompletedGrantsAccess() {
        InternetBankingSession session = InternetBankingSession.builder()
                .sessionId("IBS-MFA").customerId(100L).sessionStatus("ACTIVE").mfaCompleted(true).build();
        InternetBankingFeature payFeature = InternetBankingFeature.builder()
                .featureCode("IB-PAY-DOMESTIC").requiresMfa(true).isEnabled(true).build();

        when(sessionRepository.findBySessionId("IBS-MFA")).thenReturn(Optional.of(session));
        when(featureRepository.findByFeatureCode("IB-PAY-DOMESTIC")).thenReturn(Optional.of(payFeature));

        boolean canAccess = service.canAccessFeature("IBS-MFA", "IB-PAY-DOMESTIC");
        assertThat(canAccess).isTrue();
    }
}
