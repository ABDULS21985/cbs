package com.cbs.account.repository;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {

    Optional<Account> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    List<Account> findByCustomerId(Long customerId);

    Page<Account> findByCustomerId(Long customerId, Pageable pageable);

    List<Account> findByCustomerIdAndStatus(Long customerId, AccountStatus status);

    Page<Account> findByStatus(AccountStatus status, Pageable pageable);

    Page<Account> findByBranchCode(String branchCode, Pageable pageable);

    @Query("SELECT a FROM Account a JOIN FETCH a.product JOIN FETCH a.customer WHERE a.accountNumber = :accountNumber")
    Optional<Account> findByAccountNumberWithDetails(@Param("accountNumber") String accountNumber);

    @Query("SELECT a FROM Account a JOIN FETCH a.product WHERE a.id = :id")
    Optional<Account> findByIdWithProduct(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.account_number_seq')", nativeQuery = true)
    Long getNextAccountNumberSequence();

    @Query("SELECT COUNT(a) FROM Account a WHERE a.status = :status")
    long countByStatus(@Param("status") AccountStatus status);

    @Query("SELECT COUNT(a) FROM Account a WHERE a.customer.id = :customerId")
    long countByCustomerId(@Param("customerId") Long customerId);

    @Query("""
            SELECT COALESCE(SUM(a.bookBalance), 0)
            FROM Account a JOIN a.product p
            WHERE p.glAccountCode = :glCode
            AND a.currencyCode = :currencyCode
            AND (:branchCode IS NULL OR a.branchCode = :branchCode)
            AND a.status <> 'CLOSED'
            """)
    BigDecimal sumBookBalanceByProductGlCode(@Param("glCode") String glCode,
                                             @Param("currencyCode") String currencyCode,
                                             @Param("branchCode") String branchCode);

    @Query("""
            SELECT a.accountNumber, p.glAccountCode, a.bookBalance
            FROM Account a JOIN a.product p
            WHERE a.currencyCode = :currencyCode
            AND (:branchCode IS NULL OR a.branchCode = :branchCode)
            AND a.status <> 'CLOSED'
            ORDER BY a.accountNumber
            """)
    List<Object[]> findAccountBalancesByProductGlCode(
            @Param("currencyCode") String currencyCode,
            @Param("branchCode") String branchCode);

    // For dormancy detection (Capability 7)
    @Query("""
            SELECT a FROM Account a
            WHERE a.status = 'ACTIVE'
            AND a.lastTransactionDate IS NOT NULL
            AND a.lastTransactionDate < :cutoffDate
            """)
    List<Account> findAccountsEligibleForDormancy(@Param("cutoffDate") LocalDate cutoffDate);

    // For escheatment detection
    @Query("""
            SELECT a FROM Account a
            WHERE a.status = 'DORMANT'
            AND a.dormancyDate IS NOT NULL
            AND a.dormancyDate < :cutoffDate
            """)
    List<Account> findAccountsEligibleForEscheatment(@Param("cutoffDate") LocalDate cutoffDate);

    // Interest-bearing active accounts for batch accrual
    @Query("""
            SELECT a FROM Account a JOIN FETCH a.product p
            WHERE a.status = 'ACTIVE'
            AND p.interestBearing = true
            """)
    List<Account> findActiveInterestBearingAccounts();

    // Accounts by product for reporting
    @Query("SELECT a.product.code, COUNT(a), SUM(a.bookBalance) FROM Account a WHERE a.status = 'ACTIVE' GROUP BY a.product.code")
    List<Object[]> getAccountSummaryByProduct();
}
