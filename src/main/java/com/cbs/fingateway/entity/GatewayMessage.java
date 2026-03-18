package com.cbs.fingateway.entity;
import jakarta.persistence.*; import lombok.*; import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate;
@Entity @Table(name = "gateway_message") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GatewayMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String messageRef;
    @Column(nullable = false) private Long gatewayId;
    @Column(nullable = false, length = 10) private String direction;
    @Column(nullable = false, length = 30) private String messageType;
    @Column(nullable = false, length = 15) private String messageFormat;
    private String senderBic; private String receiverBic;
    private BigDecimal amount; private String currency; private LocalDate valueDate;
    @Builder.Default private String validationStatus = "PENDING";
    @Builder.Default private Boolean sanctionsChecked = false; private String sanctionsResult;
    @Column(nullable = false, length = 20) @Builder.Default private String deliveryStatus = "QUEUED";
    @Builder.Default private Integer deliveryAttempts = 0;
    private String ackReference; @Column(columnDefinition = "TEXT") private String nackReason;
    @Builder.Default private Instant queuedAt = Instant.now(); private Instant sentAt; private Instant ackAt;
    private Integer processingTimeMs;
    @Builder.Default private Instant createdAt = Instant.now();
}
