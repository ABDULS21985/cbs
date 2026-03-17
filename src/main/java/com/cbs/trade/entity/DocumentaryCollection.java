package com.cbs.trade.entity;

import com.cbs.common.audit.AuditableEntity;
import com.cbs.customer.entity.Customer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Entity @Table(name = "documentary_collection", schema = "cbs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DocumentaryCollection extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "collection_number", nullable = false, unique = true, length = 30) private String collectionNumber;
    @Column(name = "collection_type", nullable = false, length = 10) private String collectionType; // DP or DA
    @Column(name = "collection_role", nullable = false, length = 20) private String collectionRole;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "drawer_customer_id") private Customer drawer;
    @Column(name = "drawee_name", nullable = false, length = 200) private String draweeName;
    @Column(name = "drawee_address", columnDefinition = "TEXT") private String draweeAddress;
    @Column(name = "remitting_bank_code", length = 20) private String remittingBankCode;
    @Column(name = "collecting_bank_code", length = 20) private String collectingBankCode;
    @Column(name = "amount", nullable = false, precision = 18, scale = 2) private BigDecimal amount;
    @Column(name = "currency_code", nullable = false, length = 3) private String currencyCode;

    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "documents_list", columnDefinition = "jsonb")
    @Builder.Default private List<String> documentsList = new ArrayList<>();

    @Column(name = "tenor_days") private Integer tenorDays;
    @Column(name = "maturity_date") private LocalDate maturityDate;
    @Column(name = "acceptance_date") private LocalDate acceptanceDate;
    @Column(name = "protest_instructions", length = 200) private String protestInstructions;
    @Column(name = "status", nullable = false, length = 20) @Builder.Default private String status = "RECEIVED";
    @Column(name = "paid_amount", precision = 18, scale = 2) @Builder.Default private BigDecimal paidAmount = BigDecimal.ZERO;
    @Column(name = "paid_date") private LocalDate paidDate;
}
