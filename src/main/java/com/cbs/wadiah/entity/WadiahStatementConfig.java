package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "wadiah_statement_config", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WadiahStatementConfig extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wadiah_account_id", nullable = false, unique = true)
    private Long wadiahAccountId;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "language", nullable = false, length = 10)
    private WadiahDomainEnums.PreferredLanguage language = WadiahDomainEnums.PreferredLanguage.EN;

    @Builder.Default
    @Column(name = "include_hibah_disclaimer", nullable = false)
    private Boolean includeHibahDisclaimer = true;

    @Builder.Default
    @Column(name = "include_zakat_summary", nullable = false)
    private Boolean includeZakatSummary = true;

    @Builder.Default
    @Column(name = "include_islamic_dates", nullable = false)
    private Boolean includeIslamicDates = true;

    @Builder.Default
    @Column(name = "show_average_balance", nullable = false)
    private Boolean showAverageBalance = true;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", nullable = false, length = 30)
    private WadiahDomainEnums.StatementDeliveryMethod deliveryMethod =
            WadiahDomainEnums.StatementDeliveryMethod.PORTAL;

    @Column(name = "tenant_id")
    private Long tenantId;
}
