package com.cbs.trade.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "letter_of_credit", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class LetterOfCredit extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "lc_number", nullable = false, unique = true, length = 30) private String lcNumber;
    @Column(name = "lc_type", nullable = false, length = 30) @Enumerated(EnumType.STRING) private LcType lcType;
    @Column(name = "lc_role", nullable = false, length = 20) private String lcRole;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "applicant_customer_id", nullable = false) private Customer applicant;
    @Column(name = "beneficiary_name", nullable = false, length = 200) private String beneficiaryName;
    @Column(name = "beneficiary_address", columnDefinition = "TEXT") private String beneficiaryAddress;
    @Column(name = "beneficiary_bank_code", length = 20) private String beneficiaryBankCode;
    @Column(name = "beneficiary_bank_name", length = 200) private String beneficiaryBankName;
    @Column(name = "issuing_bank_code", length = 20) private String issuingBankCode;
    @Column(name = "advising_bank_code", length = 20) private String advisingBankCode;
    @Column(name = "confirming_bank_code", length = 20) private String confirmingBankCode;

    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "tolerance_positive_pct", precision = 5, scale = 2) @Builder.Default private BigDecimal tolerancePositivePct = BigDecimal.ZERO;
    @Column(name = "tolerance_negative_pct", precision = 5, scale = 2) @Builder.Default private BigDecimal toleranceNegativePct = BigDecimal.ZERO;
    @Column(name = "utilized_amount", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal utilizedAmount = BigDecimal.ZERO;

    @Column(name = "issue_date", nullable = false) @Builder.Default private LocalDate issueDate = LocalDate.now();
    @Column(name = "expiry_date", nullable = false) private LocalDate expiryDate;
    @Column(name = "latest_shipment_date") private LocalDate latestShipmentDate;
    @Column(name = "tenor_days") private Integer tenorDays;
    @Column(name = "payment_terms", length = 30) private String paymentTerms;
    @Column(name = "incoterms", length = 10) private String incoterms;
    @Column(name = "port_of_loading", length = 100) private String portOfLoading;
    @Column(name = "port_of_discharge", length = 100) private String portOfDischarge;
    @Column(name = "goods_description", nullable = false, columnDefinition = "TEXT") private String goodsDescription;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "required_documents", columnDefinition = "jsonb")
    @Builder.Default private List<String> requiredDocuments = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "special_conditions", columnDefinition = "jsonb")
    @Builder.Default private List<String> specialConditions = new ArrayList<>();

    @Column(name = "is_irrevocable", nullable = false) @Builder.Default private Boolean isIrrevocable = true;
    @Column(name = "is_confirmed", nullable = false) @Builder.Default private Boolean isConfirmed = false;
    @Column(name = "is_transferable", nullable = false) @Builder.Default private Boolean isTransferable = false;
    @Column(name = "ucp_version", length = 10) @Builder.Default private String ucpVersion = "UCP 600";

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "margin_account_id") private Account marginAccount;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "settlement_account_id") private Account settlementAccount;
    @Column(name = "margin_percentage", precision = 5, scale = 2) @Builder.Default private BigDecimal marginPercentage = new BigDecimal("100");
    @Column(name = "margin_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal marginAmount = BigDecimal.ZERO;
    @Column(name = "commission_rate", precision = 5, scale = 4) private BigDecimal commissionRate;
    @Column(name = "commission_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal commissionAmount = BigDecimal.ZERO;
    @Column(name = "swift_charges", precision = 18, scale = 2) @Builder.Default private BigDecimal swiftCharges = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20) @Enumerated(EnumType.STRING)
    @Builder.Default private LcStatus status = LcStatus.DRAFT;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> metadata = new HashMap<>();

    public BigDecimal availableAmount() { return amount.subtract(utilizedAmount); }
    public boolean isExpired() { return LocalDate.now().isAfter(expiryDate); }

    public void utilize(BigDecimal drawAmount) {
        this.utilizedAmount = this.utilizedAmount.add(drawAmount);
        if (this.utilizedAmount.compareTo(this.amount) >= 0) this.status = LcStatus.FULLY_UTILIZED;
        else this.status = LcStatus.PARTIALLY_UTILIZED;
    }
}
