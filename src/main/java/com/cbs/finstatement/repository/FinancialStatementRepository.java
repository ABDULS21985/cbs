package com.cbs.finstatement.repository;

import com.cbs.finstatement.entity.FinancialStatement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialStatementRepository extends JpaRepository<FinancialStatement, Long> {
    Optional<FinancialStatement> findByStatementCode(String statementCode);
    List<FinancialStatement> findByCustomerIdOrderByPeriodEndDateDesc(Long customerId);
    List<FinancialStatement> findByCustomerIdAndStatementTypeOrderByPeriodEndDateDesc(Long customerId, String statementType);
}
