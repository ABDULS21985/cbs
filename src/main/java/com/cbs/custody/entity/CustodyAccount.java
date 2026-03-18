package com.cbs.custody.entity;

import com.cbs.common.audit.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "custody_account")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @SuperBuilder
public class CustodyAccount extends AuditableEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String accountCode;

    @Column(nullable = false, length = 200)
    private String accountName;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false, length = 20)
    private String accountType;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Builder.Default
    private BigDecimal totalAssetsValue = BigDecimal.ZERO;

    @Builder.Default
    private Integer securitiesCount = 0;

    @Builder.Default
    private Boolean settlementEnabled = true;

    @Builder.Default
    private Boolean corporateActions = true;

    @Builder.Default
    private Boolean incomeCollection = true;

    @Builder.Default
    private Boolean proxyVoting = false;

    @Builder.Default
    private Boolean taxReclaim = false;

    @Builder.Default
    private Boolean fxServices = false;

    @Builder.Default
    private Boolean securitiesLending = false;

    @Column(name = "custody_fee_bps")
    @Builder.Default
    private Integer custodyFeeBps = 0;

    private BigDecimal transactionFee;

    @Column(length = 200)
    private String subCustodian;

    @Column(length = 40)
    private String depositoryId;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = "PENDING";

    private Instant openedAt;
}
