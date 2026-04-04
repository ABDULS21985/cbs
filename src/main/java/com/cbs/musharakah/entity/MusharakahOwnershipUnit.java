package com.cbs.musharakah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "musharakah_ownership_units", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MusharakahOwnershipUnit extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false, unique = true)
    private Long contractId;

    @Column(name = "total_units", nullable = false)
    private Integer totalUnits;

    @Column(name = "bank_units", precision = 19, scale = 4)
    private BigDecimal bankUnits;

    @Column(name = "customer_units", precision = 19, scale = 4)
    private BigDecimal customerUnits;

    @Column(name = "bank_percentage", precision = 10, scale = 4)
    private BigDecimal bankPercentage;

    @Column(name = "customer_percentage", precision = 10, scale = 4)
    private BigDecimal customerPercentage;

    @Column(name = "unit_value_at_inception", precision = 18, scale = 6)
    private BigDecimal unitValueAtInception;

    @Column(name = "current_unit_value", precision = 18, scale = 6)
    private BigDecimal currentUnitValue;

    @Column(name = "last_unit_value_update_date")
    private LocalDate lastUnitValueUpdateDate;

    @Column(name = "bank_share_value", precision = 18, scale = 2)
    private BigDecimal bankShareValue;

    @Column(name = "customer_share_value", precision = 18, scale = 2)
    private BigDecimal customerShareValue;

    @Column(name = "last_transfer_date")
    private LocalDate lastTransferDate;

    @Column(name = "last_transfer_units", precision = 19, scale = 4)
    private BigDecimal lastTransferUnits;

    @Column(name = "total_units_transferred", precision = 19, scale = 4)
    private BigDecimal totalUnitsTransferred;

    @Column(name = "is_fully_bought_out", nullable = false)
    @lombok.Builder.Default
    private Boolean isFullyBoughtOut = false;
}
