package com.cbs.branch.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "branch_queue_ticket", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BranchQueueTicket {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "branch_id", nullable = false) private Long branchId;

    @Column(name = "ticket_number", nullable = false) private String ticketNumber;

    @Column(name = "service_type") private String serviceType;

    @Column(name = "customer_id") private Long customerId;

    @Column(name = "priority", length = 20) @Builder.Default private String priority = "NORMAL";

    @Column(name = "counter_number") private String counterNumber;

    @Column(name = "serving_employee_id") private String servingEmployeeId;

    @Column(name = "issued_at") @Builder.Default private Instant issuedAt = Instant.now();

    @Column(name = "called_at") private Instant calledAt;

    @Column(name = "serving_started_at") private Instant servingStartedAt;

    @Column(name = "completed_at") private Instant completedAt;

    @Column(name = "wait_time_seconds") private Integer waitTimeSeconds;

    @Column(name = "service_time_seconds") private Integer serviceTimeSeconds;

    @Column(name = "status", length = 20) @Builder.Default private String status = "WAITING";

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default private Instant createdAt = Instant.now();
}
