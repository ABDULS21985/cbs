package com.cbs.integration.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Entity @Table(name = "iso20022_message")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Iso20022Message {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 80) private String messageId;
    private String businessMessageId;
    @Column(nullable = false, length = 30) private String messageDefinition; // e.g. pacs.008.001.10
    @Column(nullable = false, length = 20) private String messageCategory;
    @Column(nullable = false, length = 40) private String messageFunction;
    @Column(nullable = false, length = 10) private String direction;
    @Column(length = 11) private String senderBic;
    @Column(length = 11) private String receiverBic;
    @Column(nullable = false) private Instant creationDateTime;
    @Builder.Default private Integer numberOfTxns = 1;
    private BigDecimal totalAmount;
    @Column(length = 3) private String currency;
    @Column(columnDefinition = "TEXT") private String xmlPayload;
    @JdbcTypeCode(SqlTypes.JSON) private Map<String, Object> parsedPayload;
    @Column(nullable = false, length = 20) @Builder.Default private String validationStatus = "PENDING";
    @JdbcTypeCode(SqlTypes.JSON) private List<String> validationErrors;
    private String settlementMethod;
    private LocalDate settlementDate;
    @Column(nullable = false, length = 20) @Builder.Default private String status = "RECEIVED";
    private Long linkedTransactionId;
    @Builder.Default private Instant createdAt = Instant.now();
    @Builder.Default private Instant updatedAt = Instant.now();

    /** Parse message definition into family (e.g. "pacs" from "pacs.008.001.10") */
    public String getMessageFamily() {
        return messageDefinition != null && messageDefinition.contains(".")
                ? messageDefinition.split("\\.")[0] : messageDefinition;
    }
}
