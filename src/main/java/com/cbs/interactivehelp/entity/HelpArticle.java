package com.cbs.interactivehelp.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "help_article")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class HelpArticle extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String articleCode;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, length = 20)
    private String articleType;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 500)
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> tags;

    @Column(length = 30)
    private String productFamily;

    @Column(length = 10)
    @Builder.Default
    private String language = "en";

    @Builder.Default
    private Integer viewCount = 0;

    @Builder.Default
    private Integer helpfulnessYes = 0;

    @Builder.Default
    private Integer helpfulnessNo = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> relatedArticles;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "DRAFT";

    private Instant publishedAt;
}
