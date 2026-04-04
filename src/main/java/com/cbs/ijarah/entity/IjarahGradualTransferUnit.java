package com.cbs.ijarah.entity;

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

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "ijarah_gradual_transfer_units", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahGradualTransferUnit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transfer_mechanism_id", nullable = false)
    private Long transferMechanismId;

    @Column(name = "unit_number", nullable = false)
    private Integer unitNumber;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "unit_percentage", nullable = false, precision = 10, scale = 4)
    private BigDecimal unitPercentage;

    @Column(name = "unit_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "cumulative_ownership", nullable = false, precision = 10, scale = 4)
    private BigDecimal cumulativeOwnership;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IjarahDomainEnums.UnitTransferStatus status;

    @Column(name = "transfer_date")
    private LocalDate transferDate;

    @Column(name = "payment_amount", precision = 18, scale = 2)
    private BigDecimal paymentAmount;

    @Column(name = "payment_transaction_ref", length = 100)
    private String paymentTransactionRef;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;
}
