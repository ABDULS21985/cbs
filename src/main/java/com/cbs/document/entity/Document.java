package com.cbs.document.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "document", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class Document extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "document_ref", nullable = false, unique = true, length = 30) private String documentRef;

    @Column(name = "document_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING) private DocumentType documentType;

    @Column(name = "customer_id") private Long customerId;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "loan_account_id") private Long loanAccountId;
    @Column(name = "file_name", nullable = false, length = 300) private String fileName;
    @Column(name = "file_type", nullable = false, length = 20) private String fileType;
    @Column(name = "file_size_bytes") private Long fileSizeBytes;
    @Column(name = "storage_path", nullable = false, length = 500) private String storagePath;
    @Column(name = "checksum", length = 64) private String checksum;
    @Column(name = "description", length = 500) private String description;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "tags", columnDefinition = "jsonb")
    @Builder.Default private List<String> tags = new ArrayList<>();

    @Column(name = "expiry_date") private LocalDate expiryDate;

    @Column(name = "verification_status", nullable = false, length = 20)
    @Builder.Default private String verificationStatus = "PENDING";

    @Column(name = "verified_by", length = 100) private String verifiedBy;
    @Column(name = "verified_at") private Instant verifiedAt;
    @Column(name = "rejection_reason", length = 300) private String rejectionReason;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;

    public boolean isExpired() { return expiryDate != null && LocalDate.now().isAfter(expiryDate); }
}
