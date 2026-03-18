package com.cbs.quotemanagement.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "quote_request", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class QuoteRequest extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_ref", nullable = false, unique = true, length = 30)
    private String requestRef;

    @Column(name = "requestor_type", nullable = false, length = 15)
    private String requestorType;

    @Column(name = "requestor_id", length = 80)
    private String requestorId;

    @Column(name = "requestor_name", length = 200)
    private String requestorName;

    @Column(name = "instrument_type", nullable = false, length = 20)
    private String instrumentType;

    @Column(name = "currency_pair", length = 7)
    private String currencyPair;

    @Column(name = "tenor", length = 10)
    private String tenor;

    @Column(name = "amount", nullable = false, precision = 20, scale = 4)
    private BigDecimal amount;

    @Column(name = "direction", nullable = false, length = 10)
    private String direction;

    @Column(name = "requested_at", nullable = false)
    private Instant requestedAt;

    @Column(name = "response_deadline")
    private Instant responseDeadline;

    @Column(name = "assigned_desk_id")
    private Long assignedDeskId;

    @Column(name = "assigned_dealer_id", length = 80)
    private String assignedDealerId;

    @Column(name = "quotes_provided")
    private Integer quotesProvided;

    @Column(name = "selected_quote_id")
    private Long selectedQuoteId;

    @Column(name = "status", nullable = false, length = 15)
    private String status;
}
