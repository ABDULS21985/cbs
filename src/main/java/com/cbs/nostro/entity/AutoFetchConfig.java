package com.cbs.nostro.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(name = "auto_fetch_config", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class AutoFetchConfig extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "protocol", nullable = false, length = 10)
    private String protocol;

    @Column(name = "host", nullable = false, length = 300)
    private String host;

    @Column(name = "schedule", nullable = false, length = 50)
    @Builder.Default
    private String schedule = "0 6 * * *";

    @Column(name = "last_fetch")
    private Instant lastFetch;

    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private String status = "INACTIVE";

    @Column(name = "account_pattern", length = 100)
    private String accountPattern;
}
