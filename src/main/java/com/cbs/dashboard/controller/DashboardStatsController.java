package com.cbs.dashboard.controller;

import com.cbs.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Executive dashboard statistics and KPIs")
public class DashboardStatsController {

    private final DataSource dataSource;

    @GetMapping("/stats")
    @Operation(summary = "Get executive dashboard KPIs")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Customer counts
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) AS total, " +
                    "COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active " +
                    "FROM cbs.customer")) {
                if (rs.next()) {
                    stats.put("totalCustomers", rs.getLong("total"));
                    stats.put("activeCustomers", rs.getLong("active"));
                }
            }

            // Account counts and balances
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) AS total, " +
                    "COALESCE(SUM(book_balance), 0) AS totalBalance, " +
                    "COALESCE(SUM(CASE WHEN a.product_id IN (SELECT id FROM cbs.account_product WHERE product_category = 'SAVINGS') THEN book_balance ELSE 0 END), 0) AS totalDeposits " +
                    "FROM cbs.account a WHERE a.status = 'ACTIVE'")) {
                if (rs.next()) {
                    stats.put("totalAccounts", rs.getLong("total"));
                    stats.put("totalBalance", rs.getBigDecimal("totalBalance"));
                    stats.put("totalDeposits", rs.getBigDecimal("totalDeposits"));
                }
            }

            // Loan portfolio
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) AS totalLoans, " +
                    "COALESCE(SUM(outstanding_balance), 0) AS loanPortfolio, " +
                    "COALESCE(SUM(CASE WHEN days_past_due > 90 THEN outstanding_balance ELSE 0 END), 0) AS nplAmount " +
                    "FROM cbs.loan_account WHERE status IN ('ACTIVE','PAST_DUE')")) {
                if (rs.next()) {
                    stats.put("totalLoans", rs.getLong("totalLoans"));
                    stats.put("loanPortfolio", rs.getBigDecimal("loanPortfolio"));
                    stats.put("nplAmount", rs.getBigDecimal("nplAmount"));
                }
            }

            // Active cards
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) AS activeCards FROM cbs.card WHERE status = 'ACTIVE'")) {
                if (rs.next()) {
                    stats.put("activeCards", rs.getLong("activeCards"));
                }
            }

            // Pending transactions (today)
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT COUNT(*) AS pending FROM cbs.transaction_journal " +
                    "WHERE status = 'PENDING' AND posting_date = CURRENT_DATE")) {
                if (rs.next()) {
                    stats.put("pendingTransactions", rs.getLong("pending"));
                }
            }

        } catch (Exception e) {
            // Return partial stats if any query fails
            stats.put("error", e.getMessage());
        }

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/treasury-analytics/{currency}")
    @Operation(summary = "Get treasury analytics for a currency")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTreasuryAnalytics(@PathVariable String currency) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "currency", currency,
                "totalPosition", 0,
                "netOpenPosition", 0,
                "dailyVolume", 0,
                "avgRate", 0
        )));
    }

    @GetMapping("/dealer-desks")
    @Operation(summary = "Get dealer desk overview")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDealerDesks() {
        return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.of("desk", "FX", "traders", 4, "openPositions", 12, "pnlToday", 0),
                Map.of("desk", "MONEY_MARKET", "traders", 3, "openPositions", 8, "pnlToday", 0),
                Map.of("desk", "FIXED_INCOME", "traders", 2, "openPositions", 15, "pnlToday", 0)
        )));
    }
}
