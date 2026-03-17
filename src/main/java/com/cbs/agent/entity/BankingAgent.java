package com.cbs.agent.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "banking_agent", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankingAgent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "agent_code", nullable = false, unique = true, length = 20) private String agentCode;
    @Column(name = "agent_name", nullable = false, length = 200) private String agentName;
    @Column(name = "agent_type", nullable = false, length = 20) private String agentType;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "address", columnDefinition = "TEXT") private String address;
    @Column(name = "city", length = 100) private String city;
    @Column(name = "state_province", length = 100) private String stateProvince;
    @Column(name = "country_code", length = 3) private String countryCode;
    @Column(name = "geo_latitude", precision = 10, scale = 7) private BigDecimal geoLatitude;
    @Column(name = "geo_longitude", precision = 10, scale = 7) private BigDecimal geoLongitude;
    @Column(name = "float_account_id") private Long floatAccountId;
    @Column(name = "commission_account_id") private Long commissionAccountId;
    @Column(name = "float_balance", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal floatBalance = BigDecimal.ZERO;
    @Column(name = "min_float_balance", precision = 18, scale = 2) @Builder.Default private BigDecimal minFloatBalance = BigDecimal.ZERO;
    @Column(name = "commission_model", length = 20) private String commissionModel;
    @Column(name = "commission_rate", precision = 8, scale = 4) private BigDecimal commissionRate;
    @Column(name = "daily_txn_limit", precision = 18, scale = 2) private BigDecimal dailyTxnLimit;
    @Column(name = "single_txn_limit", precision = 18, scale = 2) private BigDecimal singleTxnLimit;
    @Column(name = "monthly_txn_limit", precision = 18, scale = 2) private BigDecimal monthlyTxnLimit;
    @Column(name = "parent_agent_code", length = 20) private String parentAgentCode;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "onboarded_date", nullable = false) @Builder.Default private LocalDate onboardedDate = LocalDate.now();
    @Column(name = "last_transaction_date") private LocalDate lastTransactionDate;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Column(name = "created_by", length = 100) private String createdBy;
    @Version @Column(name = "version") private Long version;

    public BigDecimal calculateCommission(BigDecimal amount) {
        if (commissionRate == null) return BigDecimal.ZERO;
        if ("FLAT".equals(commissionModel)) return commissionRate;
        return amount.multiply(commissionRate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
    }
}
