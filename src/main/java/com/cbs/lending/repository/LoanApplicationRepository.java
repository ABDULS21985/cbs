package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanApplication;
import com.cbs.lending.entity.LoanApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {

    Optional<LoanApplication> findByApplicationNumber(String applicationNumber);

    Page<LoanApplication> findByCustomerId(Long customerId, Pageable pageable);

    Page<LoanApplication> findByStatus(LoanApplicationStatus status, Pageable pageable);

    @Query("SELECT la FROM LoanApplication la JOIN FETCH la.customer JOIN FETCH la.loanProduct WHERE la.id = :id")
    Optional<LoanApplication> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.loan_application_seq')", nativeQuery = true)
    Long getNextApplicationSequence();

    long countByCustomerIdAndStatusIn(Long customerId, java.util.List<LoanApplicationStatus> statuses);
}
