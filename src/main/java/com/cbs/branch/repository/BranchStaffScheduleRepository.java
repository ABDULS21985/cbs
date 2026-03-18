package com.cbs.branch.repository;

import com.cbs.branch.entity.BranchStaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BranchStaffScheduleRepository extends JpaRepository<BranchStaffSchedule, Long> {
    List<BranchStaffSchedule> findByBranchIdAndScheduledDate(Long branchId, LocalDate scheduledDate);
    List<BranchStaffSchedule> findByEmployeeIdAndScheduledDateBetween(String employeeId, LocalDate start, LocalDate end);
}
