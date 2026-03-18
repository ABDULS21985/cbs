package com.cbs.channelactivity.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;

@Entity @Table(name = "channel_activity_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelActivityLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String logId;
    private Long customerId;
    @Column(length = 80) private String sessionId;
    @Column(nullable = false, length = 20) private String channel;
    @Column(nullable = false, length = 30) private String activityType;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> activityDetail;
    @Column(length = 45) private String ipAddress;
    @Column(length = 200) private String deviceFingerprint;
    @Column(length = 100) private String geoLocation;
    private Integer responseTimeMs;
    @Column(nullable = false, length = 15) @Builder.Default private String resultStatus = "SUCCESS";
    @Column(length = 30) private String errorCode;
    @Builder.Default private Instant createdAt = Instant.now();
}
