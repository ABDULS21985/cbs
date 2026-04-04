package com.cbs.qard.repository;

import com.cbs.qard.entity.QardDomainEnums;
import com.cbs.qard.entity.QardRepaymentSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface QardRepaymentScheduleRepository extends JpaRepository<QardRepaymentSchedule, Long> {

    List<QardRepaymentSchedule> findByQardAccountIdOrderByInstallmentNumberAsc(Long qardAccountId);

    List<QardRepaymentSchedule> findByQardAccountIdAndStatusOrderByInstallmentNumberAsc(
            Long qardAccountId,
            QardDomainEnums.ScheduleStatus status);

    List<QardRepaymentSchedule> findByStatusAndDueDateBefore(QardDomainEnums.ScheduleStatus status, LocalDate dueDate);
}
