package com.cbs.payments.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "domestic_payment_message", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DomesticPaymentMessage extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false)
    private Long paymentId;

    @Column(name = "rail_config_id", nullable = false)
    private Long railConfigId;

    @Column(name = "message_ref", nullable = false, unique = true, length = 50)
    private String messageRef;

    @Column(name = "message_type", nullable = false, length = 30)
    private String messageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_direction", nullable = false, length = 10)
    private IslamicPaymentDomainEnums.MessageDirection messageDirection;

    @Column(name = "message_content", columnDefinition = "TEXT")
    private String messageContent;

    @Column(name = "islamic_transaction_code", length = 50)
    private String islamicTransactionCode;

    @Column(name = "shariah_compliance_flag", length = 5)
    private String shariahComplianceFlag;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "rejection_code", length = 30)
    private String rejectionCode;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.MessageStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}
