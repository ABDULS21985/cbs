package com.cbs.shariah.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity @Table(name = "fatwa_record", schema = "cbs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FatwaRecord {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fatwa_number", nullable = false, unique = true, length = 30)
    private String fatwaNumber;

    @Column(name = "fatwa_title", nullable = false, length = 300)
    private String fatwaTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "fatwa_category", nullable = false, length = 30)
    private FatwaCategory fatwaCategory;

    @Column(name = "subject", nullable = false, length = 500)
    private String subject;

    @Column(name = "full_text", columnDefinition = "TEXT")
    private String fullText;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "aaoifi_references", columnDefinition = "jsonb")
    private List<String> aaoifiReferences;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "applicable_contract_types", columnDefinition = "jsonb")
    private List<String> applicableContractTypes;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "superseded_by_fatwa_id")
    private Long supersededByFatwaId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20) @Builder.Default
    private FatwaStatus status = FatwaStatus.DRAFT;

    @Column(name = "issued_by_board_id")
    private Long issuedByBoardId;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false) @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at") @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "created_by", length = 80)
    private String createdBy;

    @Column(name = "updated_by", length = 80)
    private String updatedBy;

    @Version @Column(name = "version")
    private Long version;

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
