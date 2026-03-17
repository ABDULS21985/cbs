package com.cbs.card.dispute;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "dispute_timeline", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DisputeTimeline {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispute_id", nullable = false)
    private CardDispute dispute;

    @Column(name = "action", nullable = false, length = 50) private String action;
    @Column(name = "from_status", length = 30) private String fromStatus;
    @Column(name = "to_status", nullable = false, length = 30) private String toStatus;
    @Column(name = "performed_by", nullable = false, length = 100) private String performedBy;
    @Column(name = "notes", columnDefinition = "TEXT") private String notes;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
