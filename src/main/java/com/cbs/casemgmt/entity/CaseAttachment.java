package com.cbs.casemgmt.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "case_attachment")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CaseAttachment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "mime_type", nullable = false, length = 100)
    private String mimeType;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(length = 128)
    private String checksum;

    @Column(name = "uploaded_by", nullable = false, length = 80)
    private String uploadedBy;

    @Column(name = "uploaded_at", nullable = false)
    @Builder.Default
    private Instant uploadedAt = Instant.now();
}
