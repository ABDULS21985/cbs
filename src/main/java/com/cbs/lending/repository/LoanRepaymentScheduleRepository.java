package com.cbs.lending.repository;

import com.cbs.lending.entity.LoanRepaymentSchedule;
import com.cbs.lending.entity.ScheduleInstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LoanRepaymentScheduleRepository extends JpaRepository<LoanRepaymentSchedule, Long> {

    List<LoanRepaymentSchedule> findByLoanAccountIdOrderByInstallmentNumberAsc(Long loanAccountId);

    Optional<LoanRepaymentSchedule> findByLoanAccountIdAndInstallmentNumber(Long loanAccountId, Integer installmentNumber);

    @Query("SELECT s FROM LoanRepaymentSchedule s WHERE s.loanAccount.id = :loanId AND s.status = 'PENDING' AND s.dueDate <= :date ORDER BY s.dueDate ASC")
    List<LoanRepaymentSchedule> findOverdueInstallments(@Param("loanId") Long loanId, @Param("date") LocalDate date);

    @Query("SELECT s FROM LoanRepaymentSchedule s WHERE s.loanAccount.id = :loanId AND s.status = 'PENDING' ORDER BY s.dueDate ASC")
    List<LoanRepaymentSchedule> findPendingInstallments(@Param("loanId") Long loanId);

    long countByLoanAccountIdAndStatus(Long loanAccountId, ScheduleInstallmentStatus status);
}
