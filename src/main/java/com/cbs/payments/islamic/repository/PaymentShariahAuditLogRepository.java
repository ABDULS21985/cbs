package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentShariahAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentShariahAuditLogRepository extends JpaRepository<PaymentShariahAuditLog, Long> {

    Optional<PaymentShariahAuditLog> findByPaymentId(Long paymentId);

    Optional<PaymentShariahAuditLog> findByPaymentRef(String paymentRef);

    List<PaymentShariahAuditLog> findByOverallResultAndScreeningTimestampBetween(
            IslamicPaymentDomainEnums.PaymentScreeningResult result,
            LocalDateTime from,
            LocalDateTime to
    );

    List<PaymentShariahAuditLog> findByActionTaken(IslamicPaymentDomainEnums.AuditActionTaken actionTaken);

    List<PaymentShariahAuditLog> findByScreeningTimestampBetween(LocalDateTime from, LocalDateTime to);
}
