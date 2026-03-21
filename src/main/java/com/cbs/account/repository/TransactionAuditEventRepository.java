package com.cbs.account.repository;

import com.cbs.account.entity.TransactionAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionAuditEventRepository extends JpaRepository<TransactionAuditEvent, Long> {

    List<TransactionAuditEvent> findByTransactionIdOrderByEventTimestampAsc(Long transactionId);
}
