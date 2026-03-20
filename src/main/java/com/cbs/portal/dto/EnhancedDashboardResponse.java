package com.cbs.portal.dto;

import com.cbs.account.dto.TransactionResponse;
import com.cbs.goal.dto.GoalResponse;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnhancedDashboardResponse {

    private Long customerId;
    private String cifNumber;
    private String displayName;

    // ── Accounts ──
    private int totalAccounts;
    private BigDecimal totalBookBalance;
    private BigDecimal totalAvailableBalance;
    private List<AccountSummary> accounts;

    // ── Financial Health ──
    private FinancialHealthSummary financialHealth;

    // ── Spending ──
    private SpendingBreakdown spendingBreakdown;

    // ── Goals ──
    private List<GoalResponse> goals;

    // ── Upcoming ──
    private List<UpcomingEvent> upcoming;

    // ── Recent Activity ──
    private List<TransactionResponse> recentActivity;

    // ─── Inner DTOs ─────────────────────────────────────────────

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AccountSummary {
        private Long id;
        private String accountNumber;
        private String accountName;
        private String accountType;
        private BigDecimal availableBalance;
        private BigDecimal bookBalance;
        private String currency;
        private String status;
        private String lastTransactionDescription;
        private String lastTransactionDate;
        private List<BigDecimal> sparkline; // 7-day balance trend
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class FinancialHealthSummary {
        private int score;                        // 0-100
        private String riskLevel;                  // LOW, MEDIUM, HIGH, CRITICAL
        private BigDecimal savingsRate;
        private Map<String, Object> factors;       // savings_ratio, expense_control, etc.
        private Map<String, Object> insights;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SpendingBreakdown {
        private BigDecimal totalThisMonth;
        private BigDecimal totalLastMonth;
        private BigDecimal changePercent;           // +15% or -10%
        private List<CategorySpend> categories;
        private List<String> smartInsights;         // "You spent 15% more on transport this month"
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CategorySpend {
        private String category;
        private BigDecimal amountThisMonth;
        private BigDecimal amountLastMonth;
        private BigDecimal budgetAmount;            // null if no budget set
        private String color;                       // hex color for chart
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpcomingEvent {
        private String type;        // SCHEDULED_TRANSFER, BILL_PAYMENT, CARD_PAYMENT, FD_MATURITY
        private String title;
        private String description;
        private LocalDate dueDate;
        private BigDecimal amount;
        private String currency;
        private String status;      // PENDING, DUE_SOON, OVERDUE
    }
}
