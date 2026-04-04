package com.cbs.wadiah.dto;

import com.cbs.wadiah.entity.WadiahDomainEnums;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OpenWadiahAccountRequest {

    @NotNull
    private Long customerId;

    @NotBlank
    private String productCode;

    @Builder.Default
    private String currencyCode = "SAR";

    @DecimalMin("0.00")
    private BigDecimal openingBalance;

    private String branchCode;
    private String relationshipManager;

    @Builder.Default
    private WadiahDomainEnums.WadiahType wadiahType = WadiahDomainEnums.WadiahType.YAD_DHAMANAH;

    @Builder.Default
    private boolean hibahEligible = false;

    @Builder.Default
    private boolean hibahDisclosureSigned = false;

    private LocalDate hibahDisclosureDate;
    private BigDecimal minimumBalance;

    @Builder.Default
    private boolean chequeBookEnabled = false;

    @Builder.Default
    private boolean debitCardEnabled = false;

    @Builder.Default
    private boolean standingOrdersEnabled = false;

    @Builder.Default
    private boolean sweepEnabled = false;

    private Long sweepTargetAccountId;
    private BigDecimal sweepThreshold;

    @Builder.Default
    private boolean onlineBankingEnabled = true;

    @Builder.Default
    private boolean mobileEnabled = true;

    @Builder.Default
    private boolean ussdEnabled = false;

    @Builder.Default
    private boolean dormancyExempt = false;

    @Builder.Default
    private WadiahDomainEnums.StatementFrequency statementFrequency =
            WadiahDomainEnums.StatementFrequency.MONTHLY;

    @Builder.Default
    private WadiahDomainEnums.PreferredLanguage preferredLanguage =
            WadiahDomainEnums.PreferredLanguage.EN;
}
