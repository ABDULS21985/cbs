package com.cbs.contactcenter.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(name = "callback_request")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CallbackRequest extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long customerId;

    private String callbackNumber;

    private Instant preferredTime;

    private String preferredLanguage;

    private String contactReason;

    @Builder.Default
    private String urgency = "NORMAL";

    private String assignedAgentId;

    @Builder.Default
    private Integer attemptCount = 0;

    @Builder.Default
    private Integer maxAttempts = 3;

    private Instant lastAttemptAt;

    private String lastOutcome;

    @Builder.Default
    private String status = "SCHEDULED";
}
