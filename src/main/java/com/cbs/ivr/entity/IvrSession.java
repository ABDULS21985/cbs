package com.cbs.ivr.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;
@Entity @Table(name = "ivr_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IvrSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String sessionId;
    @Column(nullable = false, length = 30) private String callerNumber;
    private Long customerId;
    @Column(nullable = false, length = 10) @Builder.Default private String language = "en";
    private Long currentMenuId;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> navigationPath;
    @Builder.Default private Boolean authenticated = false;
    @Builder.Default private Boolean selfServiceCompleted = false;
    @Builder.Default private Boolean transferredToAgent = false;
    private String transferReason;
    @Builder.Default private Integer durationSec = 0;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
    @Builder.Default private Instant startedAt = Instant.now();
    private Instant endedAt;
}
