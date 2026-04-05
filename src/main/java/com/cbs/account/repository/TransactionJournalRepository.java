package com.cbs.account.repository;

import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionJournalRepository extends JpaRepository<TransactionJournal, Long>, JpaSpecificationExecutor<TransactionJournal> {

    String SPEND_CATEGORY_CASE = """
            CASE
                WHEN tj.transaction_type = 'TRANSFER_OUT'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%transfer%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%send money%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%withdrawal%'
                THEN 'Transfers'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%bill%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%dstv%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%electric%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%utility%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%water%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%airtime%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%data subscription%'
                THEN 'Bills'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%salary%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%payroll%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%wages%'
                THEN 'Salaries'
                WHEN tj.transaction_type = 'FEE_DEBIT'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%fee%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%charge%'
                THEN 'Fees'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%loan repayment%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%repay%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%mortgage%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%debt%'
                THEN 'Loan Repayments'
                WHEN tj.channel = 'ATM'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%atm%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%cash withdrawal%'
                THEN 'ATM Cash'
                WHEN tj.transaction_type = 'DEBIT'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%payment%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%purchase%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%merchant%'
                THEN 'Payments'
                ELSE 'Others'
            END
            """;

    String FAILURE_REASON_CASE = """
            CASE
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%insufficient%'
                    OR LOWER(COALESCE(tj.external_ref, '')) LIKE '%insufficient%'
                THEN 'Insufficient Funds'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%limit%'
                    OR LOWER(COALESCE(tj.external_ref, '')) LIKE '%limit%'
                THEN 'Limit Exceeded'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%invalid%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%account not found%'
                    OR LOWER(COALESCE(tj.external_ref, '')) LIKE '%invalid%'
                THEN 'Invalid Account'
                WHEN LOWER(COALESCE(tj.narration, '')) LIKE '%system%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%timeout%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%network%'
                    OR LOWER(COALESCE(tj.narration, '')) LIKE '%switch%'
                    OR LOWER(COALESCE(tj.external_ref, '')) LIKE '%system%'
                THEN 'System Error'
                ELSE 'Other'
            END
            """;

    String AGGREGATE_SPEND_CATEGORIES_QUERY = """
            SELECT
            """ + SPEND_CATEGORY_CASE + """
                AS category_code,
                COALESCE(SUM(tj.amount), 0) AS total_amount,
                COUNT(*) AS txn_count,
                COALESCE(AVG(tj.amount), 0) AS avg_amount
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'POSTED'
            AND COALESCE(tj.is_reversed, false) = false
            AND tj.transaction_type IN ('DEBIT', 'TRANSFER_OUT', 'FEE_DEBIT', 'LIEN_PLACEMENT')
            GROUP BY 1
            ORDER BY total_amount DESC
            """;

    String AGGREGATE_SPEND_CATEGORY_TREND_QUERY = """
            SELECT
                DATE_TRUNC('month', tj.posting_date)::date AS period_start,
            """ + SPEND_CATEGORY_CASE + """
                AS category_code,
                COALESCE(SUM(tj.amount), 0) AS total_amount
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'POSTED'
            AND COALESCE(tj.is_reversed, false) = false
            AND tj.transaction_type IN ('DEBIT', 'TRANSFER_OUT', 'FEE_DEBIT', 'LIEN_PLACEMENT')
            GROUP BY 1, 2
            ORDER BY period_start, category_code
            """;

    String AGGREGATE_FAILURE_REASONS_QUERY = """
            SELECT
            """ + FAILURE_REASON_CASE + """
                AS failure_reason,
                COUNT(*) AS failure_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'FAILED'
            GROUP BY 1
            ORDER BY failure_count DESC, failure_reason ASC
            """;

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

    Optional<TransactionJournal> findTopByPostingDateBetweenAndTransactionTypeNotOrderByAmountDescCreatedAtDesc(
            LocalDate fromDate,
            LocalDate toDate,
            TransactionType transactionType);

    Optional<TransactionJournal> findTopByAccountIdAndStatusAndPostingDateBetweenOrderByCreatedAtDesc(
            Long accountId,
            String status,
            LocalDate fromDate,
            LocalDate toDate);

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

        @Query("""
            SELECT COALESCE(MAX(t.runningBalance), 0)
            FROM TransactionJournal t
            WHERE t.account.id = :accountId
            AND t.postingDate BETWEEN :fromDate AND :toDate
            AND t.status = 'POSTED'
            """)
        BigDecimal findMaximumBalanceInPeriod(
            @Param("accountId") Long accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

        Optional<TransactionJournal> findTopByAccountIdAndStatusAndPostingDateLessThanEqualOrderByPostingDateDescCreatedAtDesc(
            Long accountId,
            String status,
            LocalDate postingDate);

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

    @Query(value = """
            SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(tj.amount), 0) AS total_value,
                COALESCE(AVG(tj.amount), 0) AS average_value,
                COALESCE(SUM(CASE WHEN tj.status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_count,
                COALESCE(SUM(CASE
                    WHEN COALESCE(tj.is_reversed, false) = true
                        OR tj.transaction_type = 'REVERSAL'
                        OR tj.status = 'REVERSED'
                    THEN 1 ELSE 0 END), 0) AS reversed_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            """, nativeQuery = true)
    List<Object[]> aggregateAnalyticsSummary(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                COALESCE(tj.channel, 'SYSTEM') AS channel,
                COUNT(*) AS txn_count,
                COALESCE(SUM(tj.amount), 0) AS total_value,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type <> 'REVERSAL'
                    THEN 1 ELSE 0 END), 0) AS success_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY 1
            ORDER BY txn_count DESC, channel ASC
            """, nativeQuery = true)
    List<Object[]> aggregateChannelMetrics(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                tj.posting_date AS period_date,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('CREDIT', 'TRANSFER_IN', 'INTEREST_POSTING', 'OPENING_BALANCE', 'LIEN_RELEASE')
                    THEN 1 ELSE 0 END), 0) AS credit_count,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('CREDIT', 'TRANSFER_IN', 'INTEREST_POSTING', 'OPENING_BALANCE', 'LIEN_RELEASE')
                    THEN tj.amount ELSE 0 END), 0) AS credit_value,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('DEBIT', 'TRANSFER_OUT', 'FEE_DEBIT', 'LIEN_PLACEMENT')
                    THEN 1 ELSE 0 END), 0) AS debit_count,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('DEBIT', 'TRANSFER_OUT', 'FEE_DEBIT', 'LIEN_PLACEMENT')
                    THEN tj.amount ELSE 0 END), 0) AS debit_value
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY tj.posting_date
            ORDER BY tj.posting_date
            """, nativeQuery = true)
    List<Object[]> aggregateVolumeTrend(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = AGGREGATE_SPEND_CATEGORIES_QUERY, nativeQuery = true)
    List<Object[]> aggregateSpendCategories(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = AGGREGATE_SPEND_CATEGORY_TREND_QUERY, nativeQuery = true)
    List<Object[]> aggregateSpendCategoryTrend(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                DATE_TRUNC('month', tj.posting_date)::date AS period_start,
                COALESCE(tj.channel, 'SYSTEM') AS channel,
                COUNT(*) AS txn_count,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type <> 'REVERSAL'
                    THEN 1 ELSE 0 END), 0) AS success_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY 1, 2
            ORDER BY period_start, channel
            """, nativeQuery = true)
    List<Object[]> aggregateChannelSuccessTrend(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                a.id AS account_id,
                a.account_number,
                a.account_name,
                COUNT(*) AS txn_count,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('DEBIT', 'TRANSFER_OUT', 'FEE_DEBIT', 'LIEN_PLACEMENT')
                    THEN tj.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE
                    WHEN tj.status = 'POSTED'
                        AND COALESCE(tj.is_reversed, false) = false
                        AND tj.transaction_type IN ('CREDIT', 'TRANSFER_IN', 'INTEREST_POSTING', 'OPENING_BALANCE', 'LIEN_RELEASE')
                    THEN tj.amount ELSE 0 END), 0) AS total_credit,
                MAX(tj.posting_date) AS last_transaction_date
            FROM cbs.transaction_journal tj
            JOIN cbs.account a ON a.id = tj.account_id
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY a.id, a.account_number, a.account_name
            ORDER BY txn_count DESC, (COALESCE(SUM(tj.amount), 0)) DESC, a.account_number ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> aggregateTopAccounts(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("limit") int limit);

    @Query(value = """
            SELECT
                tj.posting_date AS failure_date,
                COALESCE(SUM(CASE WHEN tj.status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failure_count,
                COUNT(*) AS total_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY tj.posting_date
            ORDER BY tj.posting_date
            """, nativeQuery = true)
    List<Object[]> aggregateFailureTrend(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = AGGREGATE_FAILURE_REASONS_QUERY, nativeQuery = true)
    List<Object[]> aggregateFailureReasons(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                EXTRACT(HOUR FROM (tj.created_at AT TIME ZONE 'Africa/Lagos'))::int AS failure_hour,
                COUNT(*) AS failure_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'FAILED'
            GROUP BY 1
            ORDER BY failure_count DESC, failure_hour ASC
            """, nativeQuery = true)
    List<Object[]> aggregateFailureHotspots(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    @Query(value = """
            SELECT
                a.id AS account_id,
                a.account_number,
                a.account_name,
                COUNT(*) AS failure_count,
                MAX(tj.posting_date) AS last_failure_date
            FROM cbs.transaction_journal tj
            JOIN cbs.account a ON a.id = tj.account_id
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.status = 'FAILED'
            GROUP BY a.id, a.account_number, a.account_name
            ORDER BY failure_count DESC, last_failure_date DESC, a.account_number ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> aggregateTopFailingAccounts(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("limit") int limit);

    @Query(value = """
            SELECT
                EXTRACT(ISODOW FROM (tj.created_at AT TIME ZONE 'Africa/Lagos'))::int AS day_of_week,
                EXTRACT(HOUR FROM (tj.created_at AT TIME ZONE 'Africa/Lagos'))::int AS hour_of_day,
                COUNT(*) AS txn_count
            FROM cbs.transaction_journal tj
            WHERE tj.posting_date BETWEEN :fromDate AND :toDate
            AND tj.transaction_type <> 'REVERSAL'
            GROUP BY 1, 2
            ORDER BY day_of_week, hour_of_day
            """, nativeQuery = true)
    List<Object[]> aggregateHourlyHeatmap(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    boolean existsByExternalRef(String externalRef);
}
