package com.cbs.payments.islamic.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "domestic_payment_config", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class DomesticPaymentConfig extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "country_code", nullable = false, length = 3)
    private String countryCode;

    @Column(name = "rail_name", nullable = false, length = 40)
    private String railName;

    @Enumerated(EnumType.STRING)
    @Column(name = "rail_type", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.RailType railType;

    @Column(name = "operating_hours_start", length = 10)
    private String operatingHoursStart;

    @Column(name = "operating_hours_end", length = 10)
    private String operatingHoursEnd;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "operating_days", columnDefinition = "jsonb")
    @lombok.Builder.Default
    private List<String> operatingDays = new ArrayList<>();

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "minimum_amount", precision = 18, scale = 2)
    private BigDecimal minimumAmount;

    @Column(name = "maximum_amount", precision = 18, scale = 2)
    private BigDecimal maximumAmount;

    @Column(name = "settlement_cutoff_time", length = 10)
    private String settlementCutoffTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_format", nullable = false, length = 20)
    private IslamicPaymentDomainEnums.MessageFormat messageFormat;

    @Column(name = "bank_participant_code", length = 30)
    private String bankParticipantCode;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "tenant_id")
    private Long tenantId;
}
