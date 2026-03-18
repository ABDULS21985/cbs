package com.cbs.sessiondialogue.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "dialogue_message")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DialogueMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String messageRef;

    @Column(nullable = false)
    private Long sessionId;

    @Column(nullable = false, length = 10)
    private String senderType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 15)
    @Builder.Default
    private String contentType = "TEXT";

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> attachments;

    @Column(length = 60)
    private String intentDetected;

    private BigDecimal confidenceScore;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> suggestedActions;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
