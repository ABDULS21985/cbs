package com.cbs.salessupport.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.math.BigDecimal; import java.time.Instant; import java.util.List;

@Entity @Table(name = "sales_knowledge_article")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class SalesKnowledgeArticle extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String articleCode;
    @Column(nullable = false, length = 300) private String title;
    @Column(nullable = false, length = 20) private String articleType;
    @Column(length = 30) private String productFamily;
    @Column(length = 30) private String productCode;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> keyPoints;
    @Column(length = 20) private String targetAudience;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> tags;
    @Builder.Default private Integer viewCount = 0;
    private BigDecimal helpfulnessScore;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "DRAFT";
    private Instant publishedAt;
}
