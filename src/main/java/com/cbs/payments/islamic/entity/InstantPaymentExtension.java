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
@Table(name = "instant_payment_extension", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class InstantPaymentExtension extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_id", nullable = false, unique = true)
    private Long paymentId;

    @Column(name = "ips_rail", length = 40)
    private String ipsRail;

    @Column(name = "ips_transaction_id", length = 50)
    private String ipsTransactionId;

    @Column(name = "ips_response_code", length = 20)
    private String ipsResponseCode;

    @Column(name = "ips_response_message", columnDefinition = "TEXT")
    private String ipsResponseMessage;

    @Column(name = "request_received_at", nullable = false)
    private LocalDateTime requestReceivedAt;

    @Column(name = "screening_completed_at")
    private LocalDateTime screeningCompletedAt;

    @Column(name = "screening_duration_ms")
    private Long screeningDurationMs;

    @Column(name = "payment_submitted_at")
    private LocalDateTime paymentSubmittedAt;

    @Column(name = "payment_confirmed_at")
    private LocalDateTime paymentConfirmedAt;

    @Column(name = "total_processing_ms")
    private Long totalProcessingMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "screening_mode", length = 20)
    private IslamicPaymentDomainEnums.InstantScreeningMode screeningMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "deferred_screening_result", length = 20)
    private IslamicPaymentDomainEnums.DeferredScreeningResult deferredScreeningResult;

    @Column(name = "deferred_screening_completed_at")
    private LocalDateTime deferredScreeningCompletedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "proxy_type", length = 20)
    private IslamicPaymentDomainEnums.ProxyType proxyType;

    @Column(name = "proxy_value", length = 100)
    private String proxyValue;

    @Column(name = "resolved_account_number", length = 34)
    private String resolvedAccountNumber;

    @Column(name = "resolved_bank_code", length = 20)
    private String resolvedBankCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.InstantPaymentStatus status;

    @Column(name = "tenant_id")
    private Long tenantId;
}
