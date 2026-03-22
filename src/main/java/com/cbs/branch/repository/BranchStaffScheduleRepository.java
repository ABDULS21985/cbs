package com.cbs.branch.repository;

import com.cbs.branch.entity.BranchStaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BranchStaffScheduleRepository extends JpaRepository<BranchStaffSchedule, Long> {
    List<BranchStaffSchedule> findByBranchIdAndScheduledDate(Long branchId, LocalDate scheduledDate);
    List<BranchStaffSchedule> findByBranchIdAndScheduledDateBetweenOrderByEmployeeNameAscScheduledDateAsc(Long branchId, LocalDate start, LocalDate end);
    List<BranchStaffSchedule> findByEmployeeIdAndScheduledDateBetween(String employeeId, LocalDate start, LocalDate end);
    Optional<BranchStaffSchedule> findByBranchIdAndEmployeeIdAndScheduledDate(Long branchId, String employeeId, LocalDate scheduledDate);
    long countByBranchIdAndScheduledDateAndShiftTypeNot(Long branchId, LocalDate scheduledDate, String shiftType);
}
