package com.cbs.fraud.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "fraud_alert", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudAlert {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "alert_ref", nullable = false, unique = true, length = 30) private String alertRef;
    @Column(name = "customer_id", nullable = false) private Long customerId;
    @Column(name = "account_id") private Long accountId;
    @Column(name = "transaction_ref", length = 50) private String transactionRef;
    @Column(name = "risk_score", nullable = false) private Integer riskScore;
    @Column(name = "max_score", nullable = false) @Builder.Default private Integer maxScore = 100;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "triggered_rules", columnDefinition = "jsonb") @Builder.Default private List<String> triggeredRules = new ArrayList<>();
    @Column(name = "channel", length = 20) private String channel;
    @Column(name = "device_id", length = 100) private String deviceId;
    @Column(name = "ip_address", length = 45) private String ipAddress;
    @Column(name = "geo_location", length = 100) private String geoLocation;
    @Column(name = "description", nullable = false, columnDefinition = "TEXT") private String description;
    @Column(name = "action_taken", length = 20) private String actionTaken;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "NEW";
    @Column(name = "assigned_to", length = 100) private String assignedTo;
    @Column(name = "resolution_notes", columnDefinition = "TEXT") private String resolutionNotes;
    @Column(name = "resolved_by", length = 100) private String resolvedBy;
    @Column(name = "resolved_at") private Instant resolvedAt;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
