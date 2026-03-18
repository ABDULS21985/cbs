package com.cbs.sessiondialogue.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "dialogue_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DialogueSession extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String sessionCode;

    private Long customerId;

    @Column(nullable = false, length = 20)
    private String channel;

    @Column(length = 10)
    @Builder.Default
    private String language = "en";

    @Column(length = 60)
    private String intent;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> context;

    @Column(length = 15)
    private String customerSentiment;

    @Builder.Default
    private Boolean escalatedToHuman = false;

    @Column(length = 80)
    private String agentId;

    @Builder.Default
    private Integer messagesCount = 0;

    @Column(length = 15)
    private String resolutionStatus;

    @Column(nullable = false)
    @Builder.Default
    private Instant startedAt = Instant.now();

    private Instant endedAt;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "ACTIVE";
}
