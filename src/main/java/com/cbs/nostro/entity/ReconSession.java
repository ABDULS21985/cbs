package com.cbs.nostro.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "recon_session", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReconSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_ref", nullable = false, unique = true, length = 30)
    private String sessionRef;

    @Column(name = "recon_type", nullable = false, length = 20)
    @Builder.Default
    private String reconType = "NOSTRO";

    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "recon_date", nullable = false)
    @Builder.Default
    private LocalDate reconDate = LocalDate.now();

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "our_count", nullable = false)
    @Builder.Default
    private Integer ourCount = 0;

    @Column(name = "cp_count", nullable = false)
    @Builder.Default
    private Integer cpCount = 0;

    @Column(name = "matched_count", nullable = false)
    @Builder.Default
    private Integer matchedCount = 0;

    @Column(name = "unmatched_count", nullable = false)
    @Builder.Default
    private Integer unmatchedCount = 0;

    @Column(name = "written_off_count", nullable = false)
    @Builder.Default
    private Integer writtenOffCount = 0;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "completed_by", length = 100)
    private String completedBy;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Version
    @Column(name = "version")
    private Long version;
}
