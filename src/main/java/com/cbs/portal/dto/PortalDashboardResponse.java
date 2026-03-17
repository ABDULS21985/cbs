package com.cbs.portal.dto;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.TransactionResponse;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortalDashboardResponse {

    private Long customerId;
    private String cifNumber;
    private String displayName;
    private int totalAccounts;
    private BigDecimal totalBookBalance;
    private BigDecimal totalAvailableBalance;
    private List<AccountResponse> accounts;
    private List<TransactionResponse> recentTransactions;
    private long pendingProfileUpdates;
}
