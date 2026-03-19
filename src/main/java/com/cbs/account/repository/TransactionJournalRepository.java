package com.cbs.account.repository;

import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionJournalRepository extends JpaRepository<TransactionJournal, Long> {

    Optional<TransactionJournal> findByTransactionRef(String transactionRef);

    Page<TransactionJournal> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);

    @Query("""
            SELECT t FROM TransactionJournal t
            WHERE t.account.id IN :accountIds
            ORDER BY t.createdAt DESC
            """)
    Page<TransactionJournal> findByAccountIdsOrderByCreatedAtDesc(
            @Param("accountIds") List<Long> accountIds,
            Pageable pageable);

    @Query("""
            SELECT t FROM TransactionJournal t
            WHERE t.account.id = :accountId
            AND t.postingDate BETWEEN :fromDate AND :toDate
            ORDER BY t.createdAt DESC
            """)
    List<TransactionJournal> findByAccountIdAndDateRange(
            @Param("accountId") Long accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT t FROM TransactionJournal t
            WHERE t.account.id = :accountId
            AND t.postingDate BETWEEN :fromDate AND :toDate
            ORDER BY t.createdAt DESC
            """)
    Page<TransactionJournal> findByAccountIdAndDateRange(
            @Param("accountId") Long accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    @Query(value = "SELECT nextval('cbs.transaction_ref_seq')", nativeQuery = true)
    Long getNextTransactionRefSequence();

    @Query("""
            SELECT COALESCE(MIN(t.runningBalance), 0)
            FROM TransactionJournal t
            WHERE t.account.id = :accountId
            AND t.postingDate BETWEEN :fromDate AND :toDate
            AND t.status = 'POSTED'
            """)
    BigDecimal findMinimumBalanceInPeriod(
            @Param("accountId") Long accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT COALESCE(AVG(t.runningBalance), 0)
            FROM TransactionJournal t
            WHERE t.account.id = :accountId
            AND t.postingDate BETWEEN :fromDate AND :toDate
            AND t.status = 'POSTED'
            """)
    BigDecimal findAverageBalanceInPeriod(
            @Param("accountId") Long accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    boolean existsByExternalRef(String externalRef);
}
