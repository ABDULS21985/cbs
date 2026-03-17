package com.cbs.payments.remittance;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "remittance_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemittanceTransaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "remittance_ref", nullable = false, unique = true, length = 30) private String remittanceRef;
    @Column(name = "sender_customer_id", nullable = false) private Long senderCustomerId;
    @Column(name = "sender_account_id") private Long senderAccountId;
    @Column(name = "beneficiary_id", nullable = false) private Long beneficiaryId;
    @Column(name = "corridor_id", nullable = false) private Long corridorId;
    @Column(name = "source_amount", nullable = false, precision = 18, scale = 2) private BigDecimal sourceAmount;
    @Column(name = "source_currency", nullable = false, length = 3) private String sourceCurrency;
    @Column(name = "destination_amount", nullable = false, precision = 18, scale = 2) private BigDecimal destinationAmount;
    @Column(name = "destination_currency", nullable = false, length = 3) private String destinationCurrency;
    @Column(name = "fx_rate", nullable = false, precision = 18, scale = 8) private BigDecimal fxRate;
    @Column(name = "fx_markup", precision = 18, scale = 2) @Builder.Default private BigDecimal fxMarkup = BigDecimal.ZERO;
    @Column(name = "flat_fee", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal flatFee = BigDecimal.ZERO;
    @Column(name = "percentage_fee", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal percentageFee = BigDecimal.ZERO;
    @Column(name = "total_fee", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal totalFee = BigDecimal.ZERO;
    @Column(name = "total_debit_amount", nullable = false, precision = 18, scale = 2) private BigDecimal totalDebitAmount;
    @Column(name = "purpose_code", length = 10) private String purposeCode;
    @Column(name = "purpose_description", length = 200) private String purposeDescription;
    @Column(name = "source_of_funds", length = 100) private String sourceOfFunds;
    @Column(name = "sanctions_check_ref", length = 50) private String sanctionsCheckRef;
    @Column(name = "sanctions_check_status", length = 20) @Builder.Default private String sanctionsCheckStatus = "PENDING";
    @Column(name = "payment_rail_code", length = 20) private String paymentRailCode;
    @Column(name = "partner_ref", length = 50) private String partnerRef;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "INITIATED";
    @Column(name = "status_message", length = 300) private String statusMessage;
    @Column(name = "initiated_at", nullable = false) @Builder.Default private Instant initiatedAt = Instant.now();
    @Column(name = "sent_at") private Instant sentAt;
    @Column(name = "delivered_at") private Instant deliveredAt;
    @Column(name = "completed_at") private Instant completedAt;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
