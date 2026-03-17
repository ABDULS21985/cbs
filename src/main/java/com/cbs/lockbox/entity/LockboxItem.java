package com.cbs.lockbox.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name = "lockbox_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LockboxItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long lockboxId;
    @Column(nullable = false, unique = true, length = 80) private String itemReference;
    private String chequeNumber;
    private String drawerName;
    private String drawerBank;
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    private String remitterReference;
    private String scannedImageRef;
    private BigDecimal ocrConfidence;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "RECEIVED";
    private Instant depositedAt;
    @Column(columnDefinition = "TEXT") private String exceptionReason;
    @Builder.Default private Instant createdAt = Instant.now();
}
