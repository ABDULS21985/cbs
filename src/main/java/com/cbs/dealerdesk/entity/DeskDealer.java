package com.cbs.dealerdesk.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "desk_dealer", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class DeskDealer extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "desk_id", nullable = false)
    private Long deskId;

    @Column(name = "employee_id", nullable = false, length = 80)
    private String employeeId;

    @Column(name = "dealer_name", nullable = false, length = 200)
    private String dealerName;

    @Column(name = "dealer_role", nullable = false, length = 20)
    private String dealerRole;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "authorized_instruments", columnDefinition = "jsonb")
    private List<String> authorizedInstruments;

    @Column(name = "single_trade_limit", precision = 20, scale = 4)
    private BigDecimal singleTradeLimit;

    @Column(name = "daily_volume_limit", precision = 20, scale = 4)
    private BigDecimal dailyVolumeLimit;

    @Column(name = "requires_counter_sign")
    private Boolean requiresCounterSign;

    @Column(name = "counter_sign_threshold", precision = 20, scale = 4)
    private BigDecimal counterSignThreshold;

    @Column(name = "status", nullable = false, length = 15)
    private String status;

    @Column(name = "authorized_from", nullable = false)
    private LocalDate authorizedFrom;

    @Column(name = "authorized_to")
    private LocalDate authorizedTo;
}
