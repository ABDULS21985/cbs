package com.cbs.branch.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "branch_staff_schedule", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BranchStaffSchedule extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "branch_id", nullable = false) private Long branchId;

    @Column(name = "employee_id", nullable = false) private String employeeId;

    @Column(name = "employee_name") private String employeeName;

    @Column(name = "role") private String role;

    @Column(name = "shift_type") private String shiftType;

    @Column(name = "scheduled_date", nullable = false) private LocalDate scheduledDate;

    @Column(name = "start_time") private LocalTime startTime;

    @Column(name = "end_time") private LocalTime endTime;

    @Column(name = "is_overtime") @Builder.Default private Boolean isOvertime = false;

    @Column(name = "substitute_employee_id") private String substituteEmployeeId;

    @Column(name = "status", length = 20) @Builder.Default private String status = "SCHEDULED";
}
