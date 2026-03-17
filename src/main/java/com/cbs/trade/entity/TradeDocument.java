package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.util.*;

@Entity @Table(name = "trade_document", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TradeDocument extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "document_ref", nullable = false, unique = true, length = 30) private String documentRef;
    @Column(name = "document_category", nullable = false, length = 30) @Enumerated(EnumType.STRING) private TradeDocCategory documentCategory;
    @Column(name = "lc_id") private Long lcId;
    @Column(name = "collection_id") private Long collectionId;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "file_name", nullable = false, length = 300) private String fileName;
    @Column(name = "file_type", nullable = false, length = 20) private String fileType;
    @Column(name = "storage_path", nullable = false, length = 500) private String storagePath;
    @Column(name = "file_size_bytes") private Long fileSizeBytes;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "extracted_data", columnDefinition = "jsonb")
    @Builder.Default private Map<String, Object> extractedData = new HashMap<>();

    @Column(name = "extraction_confidence", precision = 5, scale = 2) private BigDecimal extractionConfidence;
    @Column(name = "extraction_status", length = 20) @Builder.Default private String extractionStatus = "PENDING";
    @Column(name = "verification_status", length = 20) @Builder.Default private String verificationStatus = "PENDING";
    @Column(name = "verified_by", length = 100) private String verifiedBy;
    @Column(name = "discrepancy_notes", columnDefinition = "TEXT") private String discrepancyNotes;
}
