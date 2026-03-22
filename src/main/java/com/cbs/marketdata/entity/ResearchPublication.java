package com.cbs.marketdata.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.Instant; import java.util.List;
@Entity @Table(name = "research_publication") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ResearchPublication extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String publicationCode;
    @Column(nullable = false, length = 300) private String title;
    @Column(nullable = false, length = 20) @Builder.Default private String publicationType = "EQUITY_RESEARCH";
    @Column(nullable = false, length = 200) private String author;
    /** Instrument ticker the report covers (e.g. DANGCEM, GTCO). */
    @Column(length = 40) private String instrumentCode;
    @Column(length = 40) private String sector;
    @Column(length = 40) private String region;
    @Column(nullable = false, columnDefinition = "TEXT") private String summary;
    @Column(length = 500) private String contentRef;
    /** Analyst recommendation: BUY | HOLD | SELL */
    @Column(length = 10) private String recommendation;
    /** Analyst target price for the instrument. */
    @Column(precision = 18, scale = 4) private java.math.BigDecimal targetPrice;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> tags;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> distributionList;
    @Builder.Default private Boolean complianceReviewed = false;
    @Column(columnDefinition = "TEXT") private String disclaimer;
    private Instant publishedAt;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
}
