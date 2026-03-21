package com.cbs.security.repository;

import com.cbs.security.entity.EncryptionKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EncryptionKeyRepository extends JpaRepository<EncryptionKey, Long> {
    Optional<EncryptionKey> findByKeyId(String keyId);
    List<EncryptionKey> findByStatusOrderByCreatedAtDesc(String status);
    List<EncryptionKey> findAllByOrderByCreatedAtDesc();
}
