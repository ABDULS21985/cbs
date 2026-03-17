package com.cbs.payments.repository;

import com.cbs.payments.entity.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrCodeRepository extends JpaRepository<QrCode, Long> {
    Optional<QrCode> findByQrReference(String qrReference);
    java.util.List<QrCode> findByAccountIdAndStatus(Long accountId, String status);
}
