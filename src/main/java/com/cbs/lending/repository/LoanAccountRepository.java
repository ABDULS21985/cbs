package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.entity.LoanAccountStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, Long> {

    Optional<LoanAccount> findByLoanNumber(String loanNumber);

    Page<LoanAccount> findByCustomerId(Long customerId, Pageable pageable);

    Page<LoanAccount> findByStatus(LoanAccountStatus status, Pageable pageable);

    @Query("SELECT la FROM LoanAccount la JOIN FETCH la.customer JOIN FETCH la.loanProduct WHERE la.id = :id")
    Optional<LoanAccount> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT la FROM LoanAccount la JOIN FETCH la.loanProduct WHERE la.status IN ('ACTIVE','DELINQUENT')")
    List<LoanAccount> findAllActiveLoans();

    @Query("SELECT la FROM LoanAccount la WHERE la.status IN ('ACTIVE','DELINQUENT') AND la.nextDueDate <= CURRENT_DATE")
    List<LoanAccount> findLoansWithDueInstallments();

    @Query(value = "SELECT nextval('cbs.loan_account_seq')", nativeQuery = true)
    Long getNextLoanSequence();

    @Query("SELECT SUM(la.outstandingPrincipal) FROM LoanAccount la WHERE la.customer.id = :customerId AND la.status IN ('ACTIVE','DELINQUENT')")
    java.math.BigDecimal getTotalOutstandingForCustomer(@Param("customerId") Long customerId);
}
