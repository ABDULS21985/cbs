package com.cbs.vault.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(name = "vault", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class Vault extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "vault_code", nullable = false, unique = true, length = 20) private String vaultCode;
    @Column(name = "vault_name", nullable = false, length = 100) private String vaultName;
    @Column(name = "branch_code", nullable = false, length = 20) private String branchCode;

    @Column(name = "vault_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private VaultType vaultType;

    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;
    @Column(name = "current_balance", nullable = false, precision = 18, scale = 2)
    @Builder.Default private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "minimum_balance", precision = 18, scale = 2) private BigDecimal minimumBalance;
    @Column(name = "maximum_balance", precision = 18, scale = 2) private BigDecimal maximumBalance;
    @Column(name = "insurance_limit", precision = 18, scale = 2) private BigDecimal insuranceLimit;
    @Column(name = "custodian", length = 100) private String custodian;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";

    public void cashIn(BigDecimal amount) { this.currentBalance = this.currentBalance.add(amount); }
    public void cashOut(BigDecimal amount) { this.currentBalance = this.currentBalance.subtract(amount); }
    public boolean isOverInsuranceLimit() { return insuranceLimit != null && currentBalance.compareTo(insuranceLimit) > 0; }
}
