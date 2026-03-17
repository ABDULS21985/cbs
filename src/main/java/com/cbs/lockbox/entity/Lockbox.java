package com.cbs.lockbox.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name = "lockbox")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Lockbox {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String lockboxNumber;
    @Column(nullable = false) private Long customerId;
    @Column(nullable = false) private Long creditAccountId;
    @Column(nullable = false, length = 20) @Builder.Default private String lockboxType = "STANDARD";
    @Column(nullable = false, columnDefinition = "TEXT") private String lockboxAddress;
    @Column(nullable = false, length = 10) @Builder.Default private String processingCutoffTime = "14:00";
    @Builder.Default private Boolean autoDeposit = true;
    @Builder.Default private Boolean ocrEnabled = true;
    @Column(nullable = false, length = 20) @Builder.Default private String exceptionHandling = "HOLD";
    @Builder.Default private Boolean isActive = true;
    @Builder.Default private Instant createdAt = Instant.now();
}
