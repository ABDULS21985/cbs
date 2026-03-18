package com.cbs.openitem.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "open_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class OpenItem extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String itemCode;
    @Column(nullable = false, length = 25) private String itemType;
    @Column(nullable = false, length = 20) private String itemCategory;
    @Column(nullable = false, columnDefinition = "TEXT") private String description;
    @Column(length = 80) private String referenceNumber;
    private Long relatedAccountId;
    private Long relatedTransactionId;
    @Column(nullable = false, length = 3) @Builder.Default private String currency = "USD";
    @Column(nullable = false) private BigDecimal amount;
    @Column(nullable = false) private LocalDate valueDate;
    @Builder.Default private Integer agingDays = 0;
    @Column(length = 80) private String assignedTo;
    @Column(length = 80) private String assignedTeam;
    @Column(length = 10) @Builder.Default private String priority = "MEDIUM";
    @Column(length = 20) private String resolutionAction;
    @Column(columnDefinition = "TEXT") private String resolutionNotes;
    private Instant resolvedAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "OPEN";
}
