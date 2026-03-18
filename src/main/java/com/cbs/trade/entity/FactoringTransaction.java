package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "factoring_transaction", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class FactoringTransaction extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "facility_id", nullable = false)
    private Long facilityId;

    @Column(name = "invoice_ref", length = 40)
    private String invoiceRef;

    @Column(name = "invoice_date")
    private LocalDate invoiceDate;

    @Column(name = "invoice_amount", precision = 20, scale = 4)
    private BigDecimal invoiceAmount;

    @Column(name = "buyer_name", length = 200)
    private String buyerName;

    @Column(name = "buyer_id")
    private Long buyerId;

    @Column(name = "advance_amount", precision = 20, scale = 4)
    private BigDecimal advanceAmount;

    @Column(name = "discount_amount", precision = 15, scale = 4)
    private BigDecimal discountAmount;

    @Column(name = "net_proceeds_to_seller", precision = 20, scale = 4)
    private BigDecimal netProceedsToSeller;

    @Column(name = "collection_due_date")
    private LocalDate collectionDueDate;

    @Column(name = "actual_collection_date")
    private LocalDate actualCollectionDate;

    @Column(name = "collected_amount", precision = 20, scale = 4)
    private BigDecimal collectedAmount;

    @Column(name = "dilution_amount", precision = 15, scale = 4)
    @Builder.Default
    private BigDecimal dilutionAmount = BigDecimal.ZERO;

    @Column(name = "recourse_exercised")
    @Builder.Default
    private Boolean recourseExercised = false;

    @Column(name = "recourse_amount", precision = 15, scale = 4)
    private BigDecimal recourseAmount;

    @Column(name = "service_fee_charged", precision = 15, scale = 4)
    private BigDecimal serviceFeeCharged;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "SUBMITTED";
}
