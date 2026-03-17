package com.cbs.intelligence.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity @Table(name = "document_processing_job")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentProcessingJob {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String jobId;
    private Long documentId;
    @Column(nullable = false, length = 40) private String documentType;
    @Column(nullable = false, length = 30) private String processingType;
    @Column(nullable = false, length = 20) @Builder.Default private String inputFormat = "PDF";
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> extractedData;
    private BigDecimal confidenceScore;
    @Column(nullable = false, length = 20) @Builder.Default private String verificationStatus = "PENDING";
    @JdbcTypeCode(SqlTypes.JSON) private List<String> flags;
    private Integer processingTimeMs;
    private String modelUsed;
    private String reviewedBy;
    private Instant reviewedAt;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();
}
