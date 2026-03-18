package com.cbs.partyrouting.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "party_routing_profile")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PartyRoutingProfile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long customerId;

    @Column(length = 20)
    private String preferredChannel;

    @Column(length = 10)
    @Builder.Default
    private String preferredLanguage = "en";

    private Long preferredBranchId;

    @Column(length = 80)
    private String assignedRmId;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Boolean> contactPreferences;

    @Builder.Default
    private Boolean marketingConsent = true;

    @Builder.Default
    private Boolean dataSharingConsent = false;

    @Column(length = 20)
    @Builder.Default
    private String riskProfile = "MODERATE";

    @Column(length = 20)
    @Builder.Default
    private String serviceTier = "STANDARD";

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Boolean> specialHandling;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
