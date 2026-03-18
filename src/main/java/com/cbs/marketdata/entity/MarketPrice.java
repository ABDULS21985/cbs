package com.cbs.marketdata.entity;
import jakarta.persistence.*; import lombok.*;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "market_price") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MarketPrice {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 30) private String instrumentCode;
    @Column(nullable = false, length = 15) private String priceType;
    @Column(nullable = false) private BigDecimal price;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false, length = 30) private String source;
    @Column(nullable = false) private LocalDate priceDate;
    private Instant priceTime;
    @Builder.Default private Instant createdAt = Instant.now();
}
