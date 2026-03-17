package com.cbs.sanctions.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "screening_match", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScreeningMatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "screening_id", nullable = false) private ScreeningRequest screening;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "watchlist_id", nullable = false) private Watchlist watchlist;
    @Column(name = "match_score", nullable = false, precision = 5, scale = 2) private BigDecimal matchScore;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "matched_fields", columnDefinition = "jsonb") @Builder.Default private List<String> matchedFields = new ArrayList<>();
    @Column(name = "match_type", nullable = false, length = 20) private String matchType;
    @Column(name = "disposition", length = 20) @Builder.Default private String disposition = "PENDING";
    @Column(name = "disposed_by", length = 100) private String disposedBy;
    @Column(name = "disposed_at") private Instant disposedAt;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
}
