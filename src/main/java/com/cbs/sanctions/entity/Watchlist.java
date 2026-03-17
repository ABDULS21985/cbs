package com.cbs.sanctions.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "watchlist", schema = "cbs", uniqueConstraints = @UniqueConstraint(columnNames = {"list_code","entry_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Watchlist {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "list_code", nullable = false, length = 20) private String listCode;
    @Column(name = "list_name", nullable = false, length = 100) private String listName;
    @Column(name = "list_source", nullable = false, length = 30) private String listSource;
    @Column(name = "entry_id", nullable = false, length = 50) private String entryId;
    @Column(name = "entity_type", nullable = false, length = 20) private String entityType;
    @Column(name = "primary_name", nullable = false, length = 300) private String primaryName;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "aliases", columnDefinition = "jsonb") @Builder.Default private List<String> aliases = new ArrayList<>();
    @Column(name = "date_of_birth") private LocalDate dateOfBirth;
    @Column(name = "nationality", length = 3) private String nationality;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "country_codes", columnDefinition = "jsonb") @Builder.Default private List<String> countryCodes = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "id_documents", columnDefinition = "jsonb") @Builder.Default private List<Map<String, String>> idDocuments = new ArrayList<>();
    @Column(name = "programme", length = 200) private String programme;
    @Column(name = "remarks", columnDefinition = "TEXT") private String remarks;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "listed_date") private LocalDate listedDate;
    @Column(name = "delisted_date") private LocalDate delistedDate;
    @Column(name = "last_updated") @Builder.Default private Instant lastUpdated = Instant.now();
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
