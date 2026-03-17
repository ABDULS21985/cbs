package com.cbs.billing.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import com.cbs.payments.entity.PaymentInstruction;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "bill_payment", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BillPayment extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_ref", nullable = false, unique = true, length = 40)
    private String paymentRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "biller_id", nullable = false)
    private Biller biller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debit_account_id", nullable = false)
    private Account debitAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "biller_customer_id", nullable = false, length = 50)
    private String billerCustomerId;

    @Column(name = "biller_customer_name", length = 200)
    private String billerCustomerName;

    @Column(name = "bill_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal billAmount;

    @Column(name = "fee_amount", nullable = false, precision = 18, scale = 2)
    @Builder.Default
    private BigDecimal feeAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "failure_reason", length = 300)
    private String failureReason;

    @Column(name = "biller_confirmation_ref", length = 50)
    private String billerConfirmationRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_instruction_id")
    private PaymentInstruction paymentInstruction;
}
