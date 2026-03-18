package com.cbs.security;

import com.cbs.common.exception.BusinessException;
import com.cbs.security.entity.EncryptionKey;
import com.cbs.security.repository.*;
import com.cbs.security.service.EncryptionKeyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EncryptionKeyServiceTest {

    @Mock private EncryptionKeyRepository keyRepository;
    @Mock private KeyUsageLogRepository usageLogRepository;
    @InjectMocks private EncryptionKeyService keyService;

    @Test
    @DisplayName("Key creation sets rotation schedule and generates key ID")
    void createKey() {
        when(keyRepository.save(any())).thenAnswer(inv -> { EncryptionKey k = inv.getArgument(0); k.setId(1L); return k; });
        when(usageLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EncryptionKey key = EncryptionKey.builder()
                .keyAlias("pii-encryption-key").keyType("AES_256")
                .purpose("PII_ENCRYPTION").rotationIntervalDays(90).createdBy("admin").build();

        EncryptionKey result = keyService.createKey(key);

        assertThat(result.getKeyId()).startsWith("KEY-");
        assertThat(result.getNextRotationAt()).isNotNull();
        assertThat(result.getLastRotatedAt()).isNotNull();
        assertThat(result.getEncryptedMaterial()).contains("ENVELOPE-ENCRYPTED");
    }

    @Test
    @DisplayName("Key rotation marks old key ROTATED and creates new ACTIVE key")
    void rotateKey() {
        EncryptionKey current = EncryptionKey.builder().id(1L).keyId("KEY-OLD-001")
                .keyAlias("data-key").keyType("AES_256").purpose("DATA_ENCRYPTION")
                .status("ACTIVE").rotationIntervalDays(90).build();

        when(keyRepository.findByKeyId("KEY-OLD-001")).thenReturn(Optional.of(current));
        when(keyRepository.save(any())).thenAnswer(inv -> { EncryptionKey k = inv.getArgument(0); if (k.getId() == null) k.setId(2L); return k; });
        when(usageLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EncryptionKey rotated = keyService.rotateKey("KEY-OLD-001", "security-admin");

        assertThat(current.getStatus()).isEqualTo("ROTATED");
        assertThat(rotated.getKeyId()).startsWith("KEY-");
        assertThat(rotated.getKeyId()).isNotEqualTo("KEY-OLD-001");
        assertThat(rotated.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Destroy key crypto-shreds material")
    void destroyKey() {
        EncryptionKey key = EncryptionKey.builder().id(1L).keyId("KEY-DESTROY-001")
                .keyAlias("temp-key").keyType("AES_256").purpose("FILE_ENCRYPTION")
                .encryptedMaterial("secret-material").status("ACTIVE").build();

        when(keyRepository.findByKeyId("KEY-DESTROY-001")).thenReturn(Optional.of(key));
        when(keyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(usageLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        keyService.destroyKey("KEY-DESTROY-001", "admin");

        assertThat(key.getStatus()).isEqualTo("DESTROYED");
        assertThat(key.getEncryptedMaterial()).isNull(); // crypto-shredded
    }

    @Test
    @DisplayName("Cannot rotate non-ACTIVE key")
    void cannotRotateNonActive() {
        EncryptionKey destroyed = EncryptionKey.builder().id(1L).keyId("KEY-DEAD-001")
                .status("DESTROYED").build();
        when(keyRepository.findByKeyId("KEY-DEAD-001")).thenReturn(Optional.of(destroyed));

        assertThatThrownBy(() -> keyService.rotateKey("KEY-DEAD-001", "admin"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("ACTIVE");
    }
}
