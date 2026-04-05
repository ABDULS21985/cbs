package com.cbs.wadiah.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;

@Entity
@Table(name = "wadiah_statement_record", schema = "cbs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class WadiahStatementRecord extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "statement_ref", nullable = false, unique = true, length = 80)
    private String statementRef;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "period_from", nullable = false)
    private LocalDate periodFrom;

    @Column(name = "period_to", nullable = false)
    private LocalDate periodTo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "statement_data", columnDefinition = "jsonb", nullable = false)
    private String statementData;

    @Column(name = "tenant_id")
    private Long tenantId;
}
