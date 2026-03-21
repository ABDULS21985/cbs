package com.cbs.eod.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "eod_schedule_config", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EodScheduleConfig {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auto_trigger", nullable = false) @Builder.Default
    private Boolean autoTrigger = false;

    @Column(name = "scheduled_time", length = 8) @Builder.Default
    private String scheduledTime = "22:00";

    @Column(name = "block_if_unclosed_branches", nullable = false) @Builder.Default
    private Boolean blockIfUnclosedBranches = true;

    @Column(name = "notification_emails", columnDefinition = "TEXT")
    private String notificationEmails;

    @Column(name = "auto_retry", nullable = false) @Builder.Default
    private Boolean autoRetry = false;

    @Column(name = "max_retries", nullable = false) @Builder.Default
    private Integer maxRetries = 3;

    @Column(name = "updated_at") @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Version @Column(name = "version")
    private Long version;
}
