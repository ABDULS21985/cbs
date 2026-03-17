package com.cbs.atmmgmt.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity @Table(name = "atm_journal_entry", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AtmJournalEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "terminal_id", nullable = false, length = 20) private String terminalId;
    @Column(name = "journal_type", nullable = false, length = 20) private String journalType;
    @Column(name = "card_number_masked", length = 20) private String cardNumberMasked;
    @Column(name = "amount", precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "response_code", length = 4) private String responseCode;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "SUCCESS";
    @Column(name = "error_description", length = 300) private String errorDescription;
    @Column(name = "created_at", nullable = false) @Builder.Default private Instant createdAt = Instant.now();
}
