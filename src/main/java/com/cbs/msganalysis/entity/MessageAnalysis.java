package com.cbs.msganalysis.entity;
import jakarta.persistence.*; import lombok.*; import java.time.Instant;
@Entity @Table(name = "message_analysis") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageAnalysis {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String analysisId;
    @Column(nullable = false, length = 80) private String messageRef;
    @Column(nullable = false, length = 30) private String analysisType;
    @Column(nullable = false, length = 15) private String result;
    @Builder.Default private String severity = "LOW";
    @Column(columnDefinition = "TEXT") private String details;
    private String ruleTriggered; private String autoAction;
    private String reviewedBy; private Instant reviewedAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
