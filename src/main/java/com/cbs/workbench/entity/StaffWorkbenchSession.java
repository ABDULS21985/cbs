package com.cbs.workbench.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;
@Entity @Table(name = "staff_workbench_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffWorkbenchSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String sessionId;
    @Column(nullable = false, length = 80) private String staffUserId;
    private String staffName;
    @Column(nullable = false, length = 20) @Builder.Default private String workbenchType = "TELLER";
    private Long customerId;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> activeContext;
    @Column(nullable = false, length = 15) @Builder.Default private String sessionStatus = "ACTIVE";
    @Builder.Default private Instant startedAt = Instant.now();
    @Builder.Default private Instant lastActivityAt = Instant.now();
    private Instant endedAt;
}
