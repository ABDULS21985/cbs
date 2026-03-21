package com.cbs.alm.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "alm_regulatory_submission", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AlmRegulatorySubmission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(name = "return_id", nullable = false) private Long returnId;
    @Column(name = "return_code", nullable = false, length = 20) private String returnCode;
    @Column(name = "submission_date", nullable = false) @Builder.Default private Instant submissionDate = Instant.now();
    @Column(name = "submitted_by", nullable = false, length = 100) private String submittedBy;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "SUBMITTED";
    @Column(name = "reference_number", nullable = false, length = 50) private String referenceNumber;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();

    @Version @Column(name = "version") private Long version;
}
