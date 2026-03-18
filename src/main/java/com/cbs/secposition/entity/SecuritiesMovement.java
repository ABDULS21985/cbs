package com.cbs.secposition.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "securities_movement")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecuritiesMovement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String movementRef;
    @Column(nullable = false, length = 30) private String positionId;
    @Column(nullable = false, length = 20) private String movementType;
    @Column(nullable = false) private BigDecimal quantity;
    private BigDecimal price;
    private BigDecimal settlementAmount;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(length = 30) private String counterpartyCode;
    @Column(nullable = false) private LocalDate tradeDate;
    private LocalDate settlementDate;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "PENDING";
    @Builder.Default private Instant createdAt = Instant.now();
}
