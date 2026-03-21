package com.cbs.deposit.repository;

import com.cbs.deposit.entity.RecurringDeposit;
import com.cbs.deposit.entity.RecurringDepositStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringDepositRepository extends JpaRepository<RecurringDeposit, Long> {

    Optional<RecurringDeposit> findByDepositNumber(String depositNumber);

    Page<RecurringDeposit> findByCustomerId(Long customerId, Pageable pageable);

    @Query("SELECT rd FROM RecurringDeposit rd WHERE rd.status = 'ACTIVE' AND rd.autoDebit = true AND rd.nextDueDate <= :date")
    List<RecurringDeposit> findDueForAutoDebit(@Param("date") LocalDate date);

    @Query("SELECT rd FROM RecurringDeposit rd WHERE rd.status = 'ACTIVE' AND rd.maturityDate <= :date")
    List<RecurringDeposit> findMaturedDeposits(@Param("date") LocalDate date);

    @Query("SELECT rd FROM RecurringDeposit rd JOIN FETCH rd.account JOIN FETCH rd.customer WHERE rd.id = :id")
    Optional<RecurringDeposit> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.recurring_deposit_seq')", nativeQuery = true)
    Long getNextDepositSequence();

    @Query("""
            SELECT COALESCE(SUM(rd.currentValue), 0)
            FROM RecurringDeposit rd JOIN rd.product p JOIN rd.account a
            WHERE p.glAccountCode = :glCode
            AND rd.currencyCode = :currencyCode
            AND (:branchCode IS NULL OR a.branchCode = :branchCode)
            AND rd.status <> 'CLOSED'
            """)
    BigDecimal sumCurrentValueByProductGlCode(@Param("glCode") String glCode,
                                              @Param("currencyCode") String currencyCode,
                                              @Param("branchCode") String branchCode);

    @Query("""
            SELECT rd.depositNumber, p.glAccountCode, rd.currentValue
            FROM RecurringDeposit rd JOIN rd.product p JOIN rd.account a
            WHERE rd.currencyCode = :currencyCode
            AND (:branchCode IS NULL OR a.branchCode = :branchCode)
            AND rd.status <> 'CLOSED'
            ORDER BY rd.depositNumber
            """)
    List<Object[]> findBalancesByProductGlCode(@Param("currencyCode") String currencyCode,
                                               @Param("branchCode") String branchCode);
}
