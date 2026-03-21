package com.cbs.nostro.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "break_timeline_entry", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BreakTimelineEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "break_id", nullable = false)
    private ReconciliationBreak reconBreak;

    @Column(name = "timestamp", nullable = false)
    @Builder.Default
    private Instant timestamp = Instant.now();

    @Column(name = "actor", nullable = false, length = 100)
    private String actor;

    @Column(name = "action", nullable = false, length = 200)
    private String action;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "entry_type", nullable = false, length = 15)
    @Builder.Default
    private String entryType = "INFO";
}
