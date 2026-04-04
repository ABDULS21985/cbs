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
@Table(name = "ijarah_asset_maintenance_records", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class IjarahAssetMaintenanceRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_id", nullable = false)
    private Long assetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "maintenance_type", nullable = false, length = 30)
    private IjarahDomainEnums.MaintenanceType maintenanceType;

    @Enumerated(EnumType.STRING)
    @Column(name = "responsible_party", nullable = false, length = 20)
    private IjarahDomainEnums.ResponsibleParty responsibleParty;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal cost;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "vendor_name", length = 200)
    private String vendorName;

    @Column(name = "invoice_ref", length = 100)
    private String invoiceRef;

    @Column(name = "maintenance_date", nullable = false)
    private LocalDate maintenanceDate;

    @Column(name = "completion_date")
    private LocalDate completionDate;

    @Column(name = "journal_ref", length = 40)
    private String journalRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IjarahDomainEnums.MaintenanceStatus status;
}
