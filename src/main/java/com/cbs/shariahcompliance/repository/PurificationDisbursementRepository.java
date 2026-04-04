package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.PurificationDisbursement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurificationDisbursementRepository extends JpaRepository<PurificationDisbursement, Long> {

    List<PurificationDisbursement> findByBatchId(Long batchId);

    List<PurificationDisbursement> findByRecipientId(Long recipientId);

    @Query("SELECT COALESCE(SUM(d.amount), 0) FROM PurificationDisbursement d WHERE d.recipientId = :recipientId AND d.paymentDate BETWEEN :from AND :to")
    BigDecimal sumAmountByRecipientIdAndPaymentDateBetween(@Param("recipientId") Long recipientId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
