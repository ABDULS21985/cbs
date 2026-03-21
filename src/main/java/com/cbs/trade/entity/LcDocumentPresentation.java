package com.cbs.trade.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "lc_document_presentation", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LcDocumentPresentation {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lc_id", nullable = false)
    private Long lcId;

    @Column(name = "presentation_number", nullable = false)
    private Integer presentationNumber;

    @Column(name = "presented_date", nullable = false)
    private LocalDate presentedDate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "documents_presented", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private List<String> documentsPresented = List.of();

    @Column(name = "amount_claimed", nullable = false, precision = 18, scale = 2)
    private BigDecimal amountClaimed;

    @Column(name = "examination_status", nullable = false, length = 20)
    @Builder.Default
    private String examinationStatus = "PENDING";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "discrepancies", columnDefinition = "jsonb")
    @Builder.Default
    private List<String> discrepancies = List.of();

    @Column(name = "discrepancy_waived")
    @Builder.Default
    private Boolean discrepancyWaived = false;

    @Column(name = "settlement_amount", precision = 18, scale = 2)
    private BigDecimal settlementAmount;

    @Column(name = "settlement_date")
    private LocalDate settlementDate;

    @Column(name = "settlement_ref", length = 50)
    private String settlementRef;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Version
    private Long version;
}
