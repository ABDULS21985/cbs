package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanRestructureLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanRestructureLogRepository extends JpaRepository<LoanRestructureLog, Long> {

    List<LoanRestructureLog> findByLoanAccountIdOrderByCreatedAtDesc(Long loanAccountId);
}
