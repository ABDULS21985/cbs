package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import com.cbs.payments.islamic.entity.PaymentIslamicExtension;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentIslamicExtensionRepository extends JpaRepository<PaymentIslamicExtension, Long> {

    Optional<PaymentIslamicExtension> findByPaymentId(Long paymentId);

    List<PaymentIslamicExtension> findByShariahScreeningResult(IslamicPaymentDomainEnums.PaymentScreeningResult result);

    List<PaymentIslamicExtension> findByIsHaramMccTrue();

    List<PaymentIslamicExtension> findByComplianceActionTaken(IslamicPaymentDomainEnums.PaymentComplianceAction action);

    List<PaymentIslamicExtension> findByShariahScreenedFalse();

    @Query("""
            SELECT COUNT(p)
            FROM PaymentIslamicExtension p
            WHERE p.shariahScreeningResult = :result
            AND p.createdAt BETWEEN :from AND :to
            """)
    long countByShariahScreeningResultAndCreatedAtBetween(
            @Param("result") IslamicPaymentDomainEnums.PaymentScreeningResult result,
            @Param("from") Instant from,
            @Param("to") Instant to
    );
}
