package com.cbs.channel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity @Table(name = "channel_config", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelConfig {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "channel", nullable = false, unique = true, length = 20) private String channel;
    @Column(name = "display_name", nullable = false, length = 50) private String displayName;
    @Column(name = "is_enabled", nullable = false) @Builder.Default private Boolean isEnabled = true;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "features_enabled", columnDefinition = "jsonb") @Builder.Default private List<String> featuresEnabled = new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "transaction_types", columnDefinition = "jsonb") @Builder.Default private List<String> transactionTypes = new ArrayList<>();
    @Column(name = "max_transfer_amount", precision = 18, scale = 2) private BigDecimal maxTransferAmount;
    @Column(name = "daily_limit", precision = 18, scale = 2) private BigDecimal dailyLimit;
    @Column(name = "session_timeout_secs", nullable = false) @Builder.Default private Integer sessionTimeoutSecs = 300;
    @Column(name = "operating_hours", length = 200) @Builder.Default private String operatingHours = "24/7";
    @Column(name = "maintenance_window", length = 100) private String maintenanceWindow;
    @Column(name = "is_active", nullable = false) @Builder.Default private Boolean isActive = true;
    @Column(name = "created_at") @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at") @Builder.Default private Instant updatedAt = Instant.now();
    @Version @Column(name = "version") private Long version;
}
