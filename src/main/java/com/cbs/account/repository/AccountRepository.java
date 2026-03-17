package com.cbs.account.repository;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long>, JpaSpecificationExecutor<Account> {

    Optional<Account> findByAccountNumber(String accountNumber);

    boolean existsByAccountNumber(String accountNumber);

    @EntityGraph(attributePaths = {"customer", "product"})
    List<Account> findByCustomerId(Long customerId);

    @EntityGraph(attributePaths = {"customer", "product"})
    Page<Account> findByCustomerId(Long customerId, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "product"})
    List<Account> findByCustomerIdAndStatus(Long customerId, AccountStatus status);

    @EntityGraph(attributePaths = {"customer", "product"})
    Page<Account> findByStatus(AccountStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"customer", "product"})
    Page<Account> findByBranchCode(String branchCode, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"customer", "product"})
    Page<Account> findAll(Pageable pageable);

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
