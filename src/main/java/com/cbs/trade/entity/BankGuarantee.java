package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import com.cbs.account.entity.Account;
import com.cbs.lending.entity.Collateral;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "bank_guarantee", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class BankGuarantee extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "guarantee_number", nullable = false, unique = true, length = 30) private String guaranteeNumber;
    @Column(name = "guarantee_type", nullable = false, length = 30) @Enumerated(EnumType.STRING) private GuaranteeType guaranteeType;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "applicant_customer_id", nullable = false) private Customer applicant;
    @Column(name = "beneficiary_name", nullable = false, length = 200) private String beneficiaryName;
    @Column(name = "beneficiary_address", columnDefinition = "TEXT") private String beneficiaryAddress;
    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "issue_date", nullable = false) @Builder.Default private LocalDate issueDate = LocalDate.now();
    @Column(name = "expiry_date", nullable = false) private LocalDate expiryDate;
    @Column(name = "claim_expiry_date") private LocalDate claimExpiryDate;
    @Column(name = "auto_extend", nullable = false) @Builder.Default private Boolean autoExtend = false;
    @Column(name = "extension_period_days") private Integer extensionPeriodDays;
    @Column(name = "underlying_contract_ref", length = 100) private String underlyingContractRef;
    @Column(name = "purpose", nullable = false, columnDefinition = "TEXT") private String purpose;
    @Column(name = "governing_law", length = 50) private String governingLaw;
    @Column(name = "is_demand_guarantee", nullable = false) @Builder.Default private Boolean isDemandGuarantee = true;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "claim_conditions", columnDefinition = "jsonb")
    @Builder.Default private List<String> claimConditions = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "margin_account_id") private Account marginAccount;
    @Column(name = "margin_percentage", precision = 5, scale = 2) @Builder.Default private BigDecimal marginPercentage = new BigDecimal("100");
    @Column(name = "margin_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal marginAmount = BigDecimal.ZERO;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "collateral_id") private Collateral collateral;
    @Column(name = "commission_rate", precision = 5, scale = 4) private BigDecimal commissionRate;
    @Column(name = "commission_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal commissionAmount = BigDecimal.ZERO;
    @Column(name = "claimed_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal claimedAmount = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20) @Enumerated(EnumType.STRING)
    @Builder.Default private GuaranteeStatus status = GuaranteeStatus.DRAFT;

    public boolean isExpired() { return LocalDate.now().isAfter(expiryDate); }

    public void processClaim(BigDecimal claimAmount) {
        this.claimedAmount = this.claimedAmount.add(claimAmount);
        this.status = claimedAmount.compareTo(amount) >= 0 ? GuaranteeStatus.CLAIMED : GuaranteeStatus.PARTIALLY_CLAIMED;
    }
}
