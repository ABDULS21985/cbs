package com.cbs.casemgmt.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
@Entity @Table(name = "case_note")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CaseNote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long caseId;
    @Column(nullable = false, length = 25) @Builder.Default private String noteType = "INTERNAL";
    @Column(nullable = false, length = 80) private String createdBy;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Builder.Default private Instant createdAt = Instant.now();
}
