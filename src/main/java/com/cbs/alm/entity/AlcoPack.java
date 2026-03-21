package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "alco_pack", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlcoPack {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "month", nullable = false, length = 7) private String month;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "sections", nullable = false, columnDefinition = "jsonb")
    @Builder.Default private List<String> sections = new ArrayList<>();

    @Column(name = "executive_summary", columnDefinition = "TEXT") @Builder.Default private String executiveSummary = "";

    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "DRAFT";

    @Column(name = "prepared_by", length = 100) private String preparedBy;
    @Column(name = "approved_by", length = 100) private String approvedBy;
    @Column(name = "approved_at") private Instant approvedAt;
    @Column(name = "distributed_at") private Instant distributedAt;

    @Column(name = "pack_version", nullable = false) @Builder.Default private Integer packVersion = 1;

    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();

    @Version @Column(name = "version") private Long version;
}
