package com.cbs.cheque.entity;

import com.cbs.account.entity.Account;
import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "cheque_leaf", schema = "cbs",
    uniqueConstraints = @UniqueConstraint(columnNames = {"account_id","cheque_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class ChequeLeaf extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cheque_book_id", nullable = false)
    private ChequeBook chequeBook;

    @Column(name = "cheque_number", nullable = false, length = 20)
    private String chequeNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "payee_name", length = 200) private String payeeName;
    @Column(name = "amount", precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "currency_code", length = 3) private String currencyCode;
    @Column(name = "cheque_date") private LocalDate chequeDate;
    @Column(name = "presented_date") private LocalDate presentedDate;
    @Column(name = "clearing_date") private LocalDate clearingDate;
    @Column(name = "presenting_bank_code", length = 20) private String presentingBankCode;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default private ChequeStatus status = ChequeStatus.UNUSED;

    @Column(name = "return_reason", length = 200) private String returnReason;
    @Column(name = "stop_reason", length = 200) private String stopReason;
    @Column(name = "stopped_by", length = 100) private String stoppedBy;
    @Column(name = "stopped_at") private Instant stoppedAt;
    @Column(name = "micr_code", length = 30) private String micrCode;

    public boolean isStale() {
        return chequeDate != null && LocalDate.now().isAfter(chequeDate.plusMonths(6));
    }
}
