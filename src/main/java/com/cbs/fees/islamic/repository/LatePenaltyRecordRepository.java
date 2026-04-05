package com.cbs.fees.islamic.repository;

import com.cbs.fees.islamic.entity.LatePenaltyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LatePenaltyRecordRepository extends JpaRepository<LatePenaltyRecord, Long> {

    List<LatePenaltyRecord> findByContractIdOrderByPenaltyDateDesc(Long contractId);

    List<LatePenaltyRecord> findByCustomerIdOrderByPenaltyDateDesc(Long customerId);

    List<LatePenaltyRecord> findByInstallmentIdOrderByPenaltyDateDesc(Long installmentId);

    Optional<LatePenaltyRecord> findFirstByInstallmentIdAndStatusOrderByPenaltyDateDesc(Long installmentId, String status);

    Optional<LatePenaltyRecord> findFirstByInstallmentIdAndStatusAndOutstandingAmountGreaterThanOrderByPenaltyDateDesc(
            Long installmentId,
            String status,
            BigDecimal outstandingAmount);

    Optional<LatePenaltyRecord> findFirstByFeeChargeLogId(Long feeChargeLogId);

    long countByStatusAndBlockedReason(String status, String blockedReason);

    @Query("""
            select coalesce(sum(r.penaltyAmount), 0)
            from LatePenaltyRecord r
            where r.contractId = :contractId
              and r.status = 'CHARGED'
            """)
    BigDecimal sumChargedByContractId(Long contractId);

    @Query("""
            select coalesce(sum(r.penaltyAmount), 0)
            from LatePenaltyRecord r
            where r.contractId = :contractId
              and r.status = 'CHARGED'
              and r.penaltyDate between :fromDate and :toDate
            """)
    BigDecimal sumChargedByContractIdBetween(Long contractId, LocalDate fromDate, LocalDate toDate);

    @Query("""
            select coalesce(sum(r.penaltyAmount), 0)
            from LatePenaltyRecord r
            where r.penaltyDate between :fromDate and :toDate
              and r.status = 'CHARGED'
            """)
    BigDecimal sumChargedBetween(LocalDate fromDate, LocalDate toDate);
}
