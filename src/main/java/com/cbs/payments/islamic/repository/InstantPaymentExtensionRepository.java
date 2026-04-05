package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.InstantPaymentExtension;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstantPaymentExtensionRepository extends JpaRepository<InstantPaymentExtension, Long> {

    Optional<InstantPaymentExtension> findByPaymentId(Long paymentId);

    List<InstantPaymentExtension> findByScreeningMode(IslamicPaymentDomainEnums.InstantScreeningMode screeningMode);

    List<InstantPaymentExtension> findByDeferredScreeningResult(IslamicPaymentDomainEnums.DeferredScreeningResult result);

    List<InstantPaymentExtension> findByStatusAndRequestReceivedAtBetween(
            IslamicPaymentDomainEnums.InstantPaymentStatus status,
            LocalDateTime from,
            LocalDateTime to
    );
}
