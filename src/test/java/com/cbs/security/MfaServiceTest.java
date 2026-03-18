package com.cbs.security;

import com.cbs.common.exception.BusinessException;
import com.cbs.security.entity.*;
import com.cbs.security.repository.*;
import com.cbs.security.service.MfaService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MfaServiceTest {

    @Mock private MfaEnrollmentRepository enrollmentRepository;
    @Mock private MfaChallengeRepository challengeRepository;
    @InjectMocks private MfaService mfaService;

    @Test
    @DisplayName("TOTP enrollment generates secret and sets PENDING status")
    void enrollTotp() {
        when(enrollmentRepository.countByUserIdAndStatus(1L, "ACTIVE")).thenReturn(0L);
        when(enrollmentRepository.save(any())).thenAnswer(inv -> { MfaEnrollment e = inv.getArgument(0); e.setId(1L); return e; });

        MfaEnrollment result = mfaService.enroll(1L, "TOTP", null, null);

        assertThat(result.getMfaMethod()).isEqualTo("TOTP");
        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getSecretEncrypted()).isNotNull();
        assertThat(result.getIsPrimary()).isTrue(); // first enrollment
    }

    @Test
    @DisplayName("Challenge creation fails for locked enrollment")
    void challengeFailsWhenLocked() {
        MfaEnrollment locked = MfaEnrollment.builder().id(1L).userId(1L).mfaMethod("SMS_OTP")
                .isPrimary(true).status("SUSPENDED")
                .lockedUntil(Instant.now().plus(30, ChronoUnit.MINUTES)).build();
        when(enrollmentRepository.findByUserIdAndIsPrimaryTrueAndStatus(1L, "ACTIVE"))
                .thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> mfaService.createChallenge(1L, "LOGIN", "1.2.3.4", "Chrome"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("locked");
    }

    @Test
    @DisplayName("Expired challenge returns EXPIRED status")
    void expiredChallenge() {
        MfaChallenge expired = MfaChallenge.builder().id(1L).challengeId("MFA-EXPIRED-001")
                .userId(1L).enrollmentId(1L).mfaMethod("SMS_OTP").status("PENDING")
                .expiresAt(Instant.now().minus(10, ChronoUnit.MINUTES))
                .attemptCount(0).maxAttempts(3).build();
        when(challengeRepository.findByChallengeIdAndStatus("MFA-EXPIRED-001", "PENDING"))
                .thenReturn(Optional.of(expired));
        when(challengeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> mfaService.verifyChallenge("MFA-EXPIRED-001", "123456"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("expired");
    }

    @Test
    @DisplayName("Max attempts exceeded locks enrollment")
    void maxAttemptsLock() {
        MfaChallenge challenge = MfaChallenge.builder().id(1L).challengeId("MFA-LOCK-001")
                .userId(1L).enrollmentId(1L).mfaMethod("SMS_OTP").otpHash("wrong-hash")
                .status("PENDING").expiresAt(Instant.now().plus(5, ChronoUnit.MINUTES))
                .attemptCount(2).maxAttempts(3).build();
        when(challengeRepository.findByChallengeIdAndStatus("MFA-LOCK-001", "PENDING"))
                .thenReturn(Optional.of(challenge));
        when(challengeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        MfaEnrollment enrollment = MfaEnrollment.builder().id(1L).userId(1L).failureCount(4).build();
        when(enrollmentRepository.findById(1L)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> mfaService.verifyChallenge("MFA-LOCK-001", "wrong"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Maximum attempts");
    }
}
