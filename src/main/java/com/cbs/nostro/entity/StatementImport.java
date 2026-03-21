package com.cbs.nostro.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "statement_import", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class StatementImport extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_id")
    private Long positionId;

    @Column(name = "account_number", nullable = false, length = 40)
    private String accountNumber;

    @Column(name = "bank_name", nullable = false, length = 200)
    private String bankName;

    @Column(name = "filename", nullable = false, length = 300)
    private String filename;

    @Column(name = "format", nullable = false, length = 10)
    private String format;

    @Column(name = "statement_date")
    private LocalDate statementDate;

    @Column(name = "opening_balance", precision = 18, scale = 2)
    private BigDecimal openingBalance;

    @Column(name = "closing_balance", precision = 18, scale = 2)
    private BigDecimal closingBalance;

    @Column(name = "currency", length = 3)
    private String currency;

    @Column(name = "total_credits", precision = 18, scale = 2)
    private BigDecimal totalCredits;

    @Column(name = "total_debits", precision = 18, scale = 2)
    private BigDecimal totalDebits;

    @Column(name = "entries_count", nullable = false)
    @Builder.Default
    private Integer entriesCount = 0;

    @Column(name = "status", nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "imported_by", length = 100)
    private String importedBy;

    @Column(name = "errors", columnDefinition = "TEXT")
    private String errors;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_entries", columnDefinition = "jsonb")
    @Builder.Default
    private String rawEntries = "[]";
}
