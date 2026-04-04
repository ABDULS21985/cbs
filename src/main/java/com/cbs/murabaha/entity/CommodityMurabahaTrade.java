package com.cbs.murabaha.entity;

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
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "commodity_murabaha_trades", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CommodityMurabahaTrade extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false, unique = true)
    private Long contractId;

    @Column(name = "trade_ref", nullable = false, unique = true, length = 50)
    private String tradeRef;

    @Column(name = "commodity_type", nullable = false, length = 60)
    private String commodityType;

    @Column(name = "commodity_grade", length = 60)
    private String commodityGrade;

    @Column(name = "quantity", nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "unit", nullable = false, length = 20)
    private String unit;

    @Column(name = "market_reference", nullable = false, length = 30)
    private String marketReference;

    @Column(name = "purchase_broker_name")
    private String purchaseBrokerName;

    @Column(name = "purchase_broker_id")
    private Long purchaseBrokerId;

    @Column(name = "purchase_order_ref", unique = true, length = 80)
    private String purchaseOrderRef;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price", precision = 18, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "purchase_price_per_unit", precision = 18, scale = 6)
    private BigDecimal purchasePricePerUnit;

    @Column(name = "purchase_currency", length = 3)
    private String purchaseCurrency;

    @Column(name = "purchase_confirmation_ref", length = 80)
    private String purchaseConfirmationRef;

    @Column(name = "purchase_confirmation_date")
    private LocalDate purchaseConfirmationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_status", nullable = false, length = 20)
    private MurabahaDomainEnums.CommodityPurchaseStatus purchaseStatus;

    @Column(name = "purchase_settlement_date")
    private LocalDate purchaseSettlementDate;

    @Column(name = "purchase_journal_ref", length = 40)
    private String purchaseJournalRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "bank_ownership_evidence_type", length = 40)
    private MurabahaDomainEnums.OwnershipEvidenceType bankOwnershipEvidenceType;

    @Column(name = "bank_ownership_evidence_ref", length = 120)
    private String bankOwnershipEvidenceRef;

    @Column(name = "bank_ownership_date")
    private LocalDate bankOwnershipDate;

    @Column(name = "bank_ownership_duration", length = 60)
    private String bankOwnershipDuration;

    @Column(name = "ownership_verified_by", length = 100)
    private String ownershipVerifiedBy;

    @Column(name = "ownership_verified_at")
    private Instant ownershipVerifiedAt;

    @Column(name = "ownership_risk_born_by_bank", nullable = false)
    @lombok.Builder.Default
    private Boolean ownershipRiskBornByBank = false;

    @Column(name = "sale_to_customer_date")
    private LocalDate saleToCustDate;

    @Column(name = "sale_to_customer_price", precision = 18, scale = 2)
    private BigDecimal saleToCustPrice;

    @Column(name = "sale_to_customer_confirmation_ref", length = 80)
    private String saleToCustConfirmationRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "sale_to_customer_status", nullable = false, length = 20)
    private MurabahaDomainEnums.CommoditySaleStatus saleToCustStatus;

    @Column(name = "customer_sale_broker_name")
    private String customerSaleBrokerName;

    @Column(name = "customer_sale_broker_id")
    private Long customerSaleBrokerId;

    @Column(name = "customer_sale_order_ref", length = 80)
    private String customerSaleOrderRef;

    @Column(name = "customer_sale_date")
    private LocalDate customerSaleDate;

    @Column(name = "customer_sale_price", precision = 18, scale = 2)
    private BigDecimal customerSalePrice;

    @Column(name = "customer_sale_price_per_unit", precision = 18, scale = 6)
    private BigDecimal customerSalePricePerUnit;

    @Column(name = "customer_sale_confirmation_ref", length = 80)
    private String customerSaleConfirmationRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_sale_status", nullable = false, length = 20)
    private MurabahaDomainEnums.CommoditySaleStatus customerSaleStatus;

    @Column(name = "customer_sale_settlement_date")
    private LocalDate customerSaleSettlementDate;

    @Column(name = "customer_sale_journal_ref", length = 40)
    private String customerSaleJournalRef;

    @Column(name = "customer_sale_proceeds_credited_to")
    private Long customerSaleProceedsCreditedTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_status", nullable = false, length = 30)
    private MurabahaDomainEnums.CommodityTradeStatus overallStatus;

    @Column(name = "purchase_and_sale_brokers_different", nullable = false)
    @lombok.Builder.Default
    private Boolean purchaseAndSaleBrokersDifferent = false;

    @Column(name = "ownership_transfer_sequence_valid", nullable = false)
    @lombok.Builder.Default
    private Boolean ownershipTransferSequenceValid = false;

    @Column(name = "minimum_ownership_period_met", nullable = false)
    @lombok.Builder.Default
    private Boolean minimumOwnershipPeriodMet = false;

    @Column(name = "shariah_compliance_verified", nullable = false)
    @lombok.Builder.Default
    private Boolean shariahComplianceVerified = false;

    @Column(name = "compliance_verified_by", length = 100)
    private String complianceVerifiedBy;

    @Column(name = "compliance_verified_at")
    private Instant complianceVerifiedAt;

    @Column(name = "tenant_id")
    private Long tenantId;
}
