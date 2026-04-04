package com.cbs.musharakah.entity;

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
@Table(name = "musharakah_unit_transfers", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahUnitTransfer extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "ownership_unit_id", nullable = false)
    private Long ownershipUnitId;

    @Column(name = "transfer_number", nullable = false)
    private Integer transferNumber;

    @Column(name = "transfer_date", nullable = false)
    private LocalDate transferDate;

    @Column(name = "transfer_date_hijri", length = 20)
    private String transferDateHijri;

    @Column(name = "units_transferred", precision = 19, scale = 4)
    private BigDecimal unitsTransferred;

    @Column(name = "price_per_unit", precision = 18, scale = 6)
    private BigDecimal pricePerUnit;

    @Column(name = "total_transfer_price", precision = 18, scale = 2)
    private BigDecimal totalTransferPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_method", length = 20)
    private MusharakahDomainEnums.TransferPricingMethod pricingMethod;

    @Column(name = "bank_units_before", precision = 19, scale = 4)
    private BigDecimal bankUnitsBefore;

    @Column(name = "bank_units_after", precision = 19, scale = 4)
    private BigDecimal bankUnitsAfter;

    @Column(name = "customer_units_before", precision = 19, scale = 4)
    private BigDecimal customerUnitsBefore;

    @Column(name = "customer_units_after", precision = 19, scale = 4)
    private BigDecimal customerUnitsAfter;

    @Column(name = "bank_percentage_before", precision = 10, scale = 4)
    private BigDecimal bankPercentageBefore;

    @Column(name = "bank_percentage_after", precision = 10, scale = 4)
    private BigDecimal bankPercentageAfter;

    @Column(name = "customer_percentage_before", precision = 10, scale = 4)
    private BigDecimal customerPercentageBefore;

    @Column(name = "customer_percentage_after", precision = 10, scale = 4)
    private BigDecimal customerPercentageAfter;

    @Column(name = "book_value_of_units_transferred", precision = 18, scale = 2)
    private BigDecimal bookValueOfUnitsTransferred;

    @Column(name = "gain_on_transfer", precision = 18, scale = 2)
    private BigDecimal gainOnTransfer;

    @Column(name = "loss_on_transfer", precision = 18, scale = 2)
    private BigDecimal lossOnTransfer;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;

    @Column(name = "payment_transaction_ref", length = 80)
    private String paymentTransactionRef;

    @Column(name = "payment_amount", precision = 18, scale = 2)
    private BigDecimal paymentAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MusharakahDomainEnums.InstallmentStatus status;

    @Column(name = "paid_date")
    private LocalDate paidDate;
}
