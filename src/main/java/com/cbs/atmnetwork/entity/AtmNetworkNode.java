package com.cbs.atmnetwork.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
@Entity @Table(name = "atm_network_node")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AtmNetworkNode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String terminalId;
    @Column(nullable = false, length = 20) private String terminalType;
    private String networkZone;
    private Long branchId;
    @Column(nullable = false, columnDefinition = "TEXT") private String locationAddress;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String manufacturer;
    private String model;
    private String softwareVersion;
    private BigDecimal cashCapacity;
    @Builder.Default private BigDecimal currentCashLevel = BigDecimal.ZERO;
    private BigDecimal lowCashThreshold;
    private Instant lastReplenishedAt;
    private LocalDate nextReplenishmentDue;
    @Builder.Default private BigDecimal uptimePctMtd = new BigDecimal("100.00");
    @Builder.Default private Integer transactionsToday = 0;
    @Builder.Default private Integer transactionsMtd = 0;
    private Instant lastTransactionAt;
    private Instant lastMaintenanceAt;
    private LocalDate nextMaintenanceDue;
    @Builder.Default private Boolean firmwareUpdatePending = false;
    @Column(nullable = false, length = 20) @Builder.Default private String operationalStatus = "ONLINE";
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
