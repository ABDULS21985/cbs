package com.cbs.deposit.repository;

import com.cbs.deposit.entity.InstallmentStatus;
import com.cbs.deposit.entity.RecurringDepositInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringDepositInstallmentRepository extends JpaRepository<RecurringDepositInstallment, Long> {

    List<RecurringDepositInstallment> findByRecurringDepositIdOrderByInstallmentNumberAsc(Long recurringDepositId);

    Optional<RecurringDepositInstallment> findByRecurringDepositIdAndInstallmentNumber(Long recurringDepositId, Integer installmentNumber);

    @Query("SELECT i FROM RecurringDepositInstallment i WHERE i.recurringDeposit.id = :rdId AND i.status = 'PENDING' AND i.dueDate <= :date ORDER BY i.dueDate ASC")
    List<RecurringDepositInstallment> findOverdueInstallments(@Param("rdId") Long rdId, @Param("date") LocalDate date);

    long countByRecurringDepositIdAndStatus(Long recurringDepositId, InstallmentStatus status);
}
