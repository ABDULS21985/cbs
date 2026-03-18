package com.cbs.provider.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "service_provider", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ServiceProvider extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_code", nullable = false, unique = true, length = 30)
    private String providerCode;

    @Column(name = "provider_name", nullable = false, length = 200)
    private String providerName;

    @Column(name = "provider_type", nullable = false, length = 25)
    private String providerType;

    @Column(name = "integration_method", length = 15)
    private String integrationMethod;

    @Column(name = "base_url", length = 500)
    private String baseUrl;

    @Column(name = "api_version", length = 20)
    private String apiVersion;

    @Column(name = "auth_type", length = 15)
    private String authType;

    @Column(name = "contract_reference", length = 80)
    private String contractReference;

    @Column(name = "sla_response_time_ms")
    private Integer slaResponseTimeMs;

    @Column(name = "sla_uptime_pct", precision = 5, scale = 2)
    private BigDecimal slaUptimePct;

    @Column(name = "actual_avg_response_time_ms")
    private Integer actualAvgResponseTimeMs;

    @Column(name = "actual_uptime_pct", precision = 5, scale = 2)
    private BigDecimal actualUptimePct;

    @Column(name = "monthly_volume_limit")
    private Integer monthlyVolumeLimit;

    @Column(name = "current_month_volume")
    @Builder.Default
    private Integer currentMonthVolume = 0;

    @Column(name = "cost_model", length = 15)
    private String costModel;

    @Column(name = "cost_per_call", precision = 12, scale = 4)
    private BigDecimal costPerCall;

    @Column(name = "monthly_cost", precision = 12, scale = 4)
    private BigDecimal monthlyCost;

    @Column(name = "primary_contact_name", length = 200)
    private String primaryContactName;

    @Column(name = "primary_contact_email", length = 200)
    private String primaryContactEmail;

    @Column(name = "primary_contact_phone", length = 30)
    private String primaryContactPhone;

    @Column(name = "escalation_contact_name", length = 200)
    private String escalationContactName;

    @Column(name = "escalation_contact_email", length = 200)
    private String escalationContactEmail;

    @Column(name = "last_health_check_at")
    private Instant lastHealthCheckAt;

    @Column(name = "health_status", nullable = false, length = 10)
    @Builder.Default
    private String healthStatus = "UNKNOWN";

    @Column(name = "failover_provider_id")
    private Long failoverProviderId;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "ONBOARDING";
}
