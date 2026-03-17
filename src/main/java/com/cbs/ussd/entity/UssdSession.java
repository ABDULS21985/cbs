package com.cbs.ussd.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "ussd_session", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UssdSession {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "session_id", nullable = false, length = 50) private String sessionId;
    @Column(name = "msisdn", nullable = false, length = 20) private String msisdn;
    @Column(name = "customer_id") private Long customerId;
    @Column(name = "current_menu_code", length = 20) private String currentMenuCode;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "session_data", columnDefinition = "jsonb") @Builder.Default private Map<String, Object> sessionData = new HashMap<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "input_history", columnDefinition = "jsonb") @Builder.Default private List<String> inputHistory = new ArrayList<>();
    @Column(name = "started_at", nullable = false) @Builder.Default private Instant startedAt = Instant.now();
    @Column(name = "last_input_at") private Instant lastInputAt;
    @Column(name = "ended_at") private Instant endedAt;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "ACTIVE";
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();

    public void recordInput(String input) { inputHistory.add(input); lastInputAt = Instant.now(); }
}
