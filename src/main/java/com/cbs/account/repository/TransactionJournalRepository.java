package com.cbs.account.repository;

import com.cbs.account.entity.TransactionJournal;
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

    List<TransactionJournal> findByPostingGroupRefOrderByCreatedAtAsc(String postingGroupRef);

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

    @Query(value = """
            SELECT
                COALESCE(SUM(CASE WHEN tj.transaction_type = 'CREDIT' THEN tj.amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN tj.transaction_type = 'DEBIT' THEN tj.amount ELSE 0 END), 0) AS total_expenses
            FROM cbs.transaction_journal tj
            JOIN cbs.account a ON a.id = tj.account_id
            WHERE a.customer_id = :customerId
            AND tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'POSTED'
            AND tj.is_reversed = false
            """, nativeQuery = true)
    Object[] aggregatePostedCreditsAndDebitsByCustomer(
            @Param("customerId") Long customerId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                CASE
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%rent%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%mortgage%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%lease%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%landlord%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%accommodation%'
                    THEN 'HOUSING'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%food%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%grocer%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%supermarket%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%restaurant%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%cafe%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%meal%'
                    THEN 'FOOD'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%transport%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%fuel%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%uber%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%bolt%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%taxi%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%bus%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%train%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%flight%'
                    THEN 'TRANSPORT'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%utility%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%electric%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%water%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%power%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%internet%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%cable%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%airtime%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%data subscription%'
                    THEN 'UTILITIES'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%hospital%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%clinic%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%pharmacy%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%medical%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%doctor%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%health%'
                    THEN 'HEALTHCARE'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%school%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%tuition%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%education%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%course%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%exam%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%book%'
                    THEN 'EDUCATION'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%movie%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%cinema%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%netflix%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%spotify%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%show%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%game%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%concert%'
                    THEN 'ENTERTAINMENT'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%shop%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%store%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%mall%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%amazon%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%jumia%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%konga%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%retail%'
                    THEN 'SHOPPING'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%savings%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%investment%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%mutual fund%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%treasury bill%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%fixed deposit%'
                    THEN 'SAVINGS'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%loan repayment%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%repay%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%debt%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%credit card%'
                    THEN 'DEBT_REPAYMENT'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%insurance%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%premium%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%assurance%'
                    THEN 'INSURANCE'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%charity%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%donation%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%tithe%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%offering%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%gift%'
                    THEN 'CHARITY'
                    WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%transfer%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%send money%'
                        OR LOWER(COALESCE(tj.narration, '')) LIKE '%withdrawal%'
                    THEN 'TRANSFER'
                    ELSE 'OTHER'
                END AS category_code,
                COALESCE(SUM(tj.amount), 0) AS total_amount
            FROM cbs.transaction_journal tj
            JOIN cbs.account a ON a.id = tj.account_id
            WHERE a.customer_id = :customerId
            AND tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'POSTED'
            AND tj.is_reversed = false
            AND tj.transaction_type = 'DEBIT'
            GROUP BY 1
            ORDER BY total_amount DESC
            """, nativeQuery = true)
    List<Object[]> aggregatePostedDebitCategoriesByCustomer(
            @Param("customerId") Long customerId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    boolean existsByExternalRef(String externalRef);
}
