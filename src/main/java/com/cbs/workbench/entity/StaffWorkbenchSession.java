package com.cbs.workbench.entity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;
@Entity @Table(name = "staff_workbench_session")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffWorkbenchSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String sessionId;
    @Column(nullable = false) private Long staffUserId;
    private String staffName;
    @Column(nullable = false, length = 20) private String workbenchType;
    private Long customerContextId;
    @JdbcTypeCode(SqlTypes.JSON) private List<Long> activeCases;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> openTabs;
    @Builder.Default private Instant lastActivityAt = Instant.now();
    @Column(nullable = false, length = 15) @Builder.Default private String sessionStatus = "ACTIVE";
    @Builder.Default private Instant loginAt = Instant.now();
    private Instant logoutAt;
    @Builder.Default private Instant createdAt = Instant.now();
}
