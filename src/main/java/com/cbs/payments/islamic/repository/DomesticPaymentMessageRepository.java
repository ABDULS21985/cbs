package com.cbs.payments.islamic.repository;

import com.cbs.payments.islamic.entity.DomesticPaymentMessage;
import com.cbs.payments.islamic.entity.IslamicPaymentDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DomesticPaymentMessageRepository extends JpaRepository<DomesticPaymentMessage, Long> {

    Optional<DomesticPaymentMessage> findByPaymentId(Long paymentId);

    Optional<DomesticPaymentMessage> findByMessageRef(String messageRef);

    List<DomesticPaymentMessage> findByStatusAndSubmittedAtBetween(
            IslamicPaymentDomainEnums.MessageStatus status,
            LocalDateTime from,
            LocalDateTime to
    );

    List<DomesticPaymentMessage> findByRailConfigIdAndStatus(Long railConfigId, IslamicPaymentDomainEnums.MessageStatus status);
}
