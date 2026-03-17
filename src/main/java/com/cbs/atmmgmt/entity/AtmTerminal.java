package com.cbs.atmmgmt.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "atm_terminal", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AtmTerminal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "terminal_id", nullable = false, unique = true, length = 20) private String terminalId;
    @Column(name = "terminal_name", nullable = false, length = 100) private String terminalName;
    @Column(name = "terminal_type", nullable = false, length = 20) private String terminalType;
    @Column(name = "branch_code", length = 20) private String branchCode;
    @Column(name = "address", columnDefinition = "TEXT") private String address;
    @Column(name = "city", length = 100) private String city;
    @Column(name = "geo_latitude", precision = 10, scale = 7) private BigDecimal geoLatitude;
    @Column(name = "geo_longitude", precision = 10, scale = 7) private BigDecimal geoLongitude;
    @Column(name = "vault_id") private Long vaultId;
    @Column(name = "current_cash_balance", nullable = false, precision = 18, scale = 2) @Builder.Default private BigDecimal currentCashBalance = BigDecimal.ZERO;
    @Column(name = "max_cash_capacity", precision = 18, scale = 2) private BigDecimal maxCashCapacity;
    @Column(name = "min_cash_threshold", precision = 18, scale = 2) private BigDecimal minCashThreshold;
    @Column(name = "currency_code", nullable = false, length = 3) @Builder.Default private String currencyCode = "USD";
    @Column(name = "last_replenished_at") private Instant lastReplenishedAt;
    @Column(name = "forecasted_empty_date") private LocalDate forecastedEmptyDate;
    @Column(name = "manufacturer", length = 50) private String manufacturer;
    @Column(name = "model", length = 50) private String model;
    @Column(name = "serial_number", length = 50) private String serialNumber;
    @Column(name = "software_version", length = 30) private String softwareVersion;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ONLINE";
    @Column(name = "last_health_check") private Instant lastHealthCheck;
    @Column(name = "supports_cardless", nullable = false) @Builder.Default private Boolean supportsCardless = false;
    @Column(name = "supports_deposit", nullable = false) @Builder.Default private Boolean supportsDeposit = false;
    @Column(name = "supports_cheque_deposit", nullable = false) @Builder.Default private Boolean supportsChequeDeposit = false;
    @Column(name = "installed_date") private LocalDate installedDate;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;

    public boolean isLowOnCash() { return minCashThreshold != null && currentCashBalance.compareTo(minCashThreshold) <= 0; }
    public void dispense(BigDecimal amount) { this.currentCashBalance = this.currentCashBalance.subtract(amount); }
    public void replenish(BigDecimal amount) { this.currentCashBalance = this.currentCashBalance.add(amount); this.lastReplenishedAt = Instant.now(); }
}
