package com.cbs.marketdata.entity;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*; import lombok.*; import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode; import org.hibernate.type.SqlTypes;
import java.time.Instant; import java.util.List;
@Entity @Table(name = "market_data_feed") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class MarketDataFeed extends AuditableEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String feedCode;
    @Column(nullable = false, length = 200) private String feedName;
    @Column(nullable = false, length = 60) private String provider;
    @Column(nullable = false, length = 20) private String feedType;
    @Column(nullable = false, length = 20) private String dataCategory;
    @JdbcTypeCode(SqlTypes.JSON) private List<String> instrumentsCovered;
    private Integer updateFrequencySec;
    @Column(length = 20) private String connectionProtocol;
    @Column(length = 500) private String endpointUrl;
    private Instant lastUpdateAt;
    @Builder.Default private Integer recordsToday = 0;
    @Builder.Default private Integer errorCountToday = 0;
    @Builder.Default private Boolean isActive = true;
    @Column(nullable = false, length = 15) @Builder.Default private String status = "ACTIVE";
}
