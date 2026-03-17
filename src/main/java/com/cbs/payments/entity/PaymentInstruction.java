package com.cbs.payments.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payment_instruction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class PaymentInstruction extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "instruction_ref", nullable = false, unique = true, length = 40)
    private String instructionRef;

    @Column(name = "payment_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private PaymentType paymentType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id")
    private Account debitAccount;

    @Column(name = "debit_account_number", nullable = false, length = 34)
    private String debitAccountNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_account_id")
    private Account creditAccount;

    @Column(name = "credit_account_number", nullable = false, length = 34)
    private String creditAccountNumber;

    @Column(name = "beneficiary_name", length = 200)
    private String beneficiaryName;

    @Column(name = "beneficiary_bank_code", length = 20)
    private String beneficiaryBankCode;

    @Column(name = "beneficiary_bank_name", length = 200)
    private String beneficiaryBankName;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    // FX
    @Column(name = "fx_rate", precision = 18, scale = 8)
    private BigDecimal fxRate;

    @Column(name = "fx_source_currency", length = 3)
    private String fxSourceCurrency;

    @Column(name = "fx_target_currency", length = 3)
    private String fxTargetCurrency;

    @Column(name = "fx_converted_amount", precision = 18, scale = 2)
    private BigDecimal fxConvertedAmount;

    // Routing
    @Column(name = "payment_rail", length = 30)
    private String paymentRail;

    @Column(name = "clearing_system", length = 50)
    private String clearingSystem;

    @Column(name = "routing_code", length = 30)
    private String routingCode;

    @Column(name = "value_date", nullable = false)
    @Builder.Default
    private LocalDate valueDate = LocalDate.now();

    @Column(name = "execution_date")
    private LocalDate executionDate;

    // SWIFT
    @Column(name = "swift_message_type", length = 10)
    private String swiftMessageType;

    @Column(name = "swift_uetr", length = 36)
    private String swiftUetr;

    @Column(name = "purpose_code", length = 10)
    private String purposeCode;

    @Column(name = "remittance_info", columnDefinition = "TEXT")
    private String remittanceInfo;

    @Column(name = "charge_type", length = 10)
    @Builder.Default
    private String chargeType = "SHA";

    @Column(name = "charge_amount", precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal chargeAmount = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "failure_reason", columnDefinition = "TEXT")
    private String failureReason;

    @Column(name = "screening_status", length = 20)
    @Builder.Default
    private String screeningStatus = "PENDING";

    @Column(name = "screening_ref", length = 50)
    private String screeningRef;

    @Column(name = "batch_id", length = 30)
    private String batchId;

    @Column(name = "batch_sequence")
    private Integer batchSequence;
}
