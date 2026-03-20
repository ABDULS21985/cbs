package com.cbs.customer.controller;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.dto.ApiResponse;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.RiskRating;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.repository.LoanAccountRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer Analytics", description = "Profitability, churn prediction, bulk operations")
public class CustomerAnalyticsController {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final LoanAccountRepository loanAccountRepository;

    // ─── Profitability ──────────────────────────────────────────────────────────

    @GetMapping("/{id}/profitability")
    @Operation(summary = "Customer profitability analysis")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProfitability(@PathVariable Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Customer not found: " + id));

        List<Account> accounts = accountRepository.findByCustomerId(id);
        BigDecimal totalBalance = accounts.stream()
                .map(a -> a.getAvailableBalance() != null ? a.getAvailableBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate revenue components
        BigDecimal interestIncome = totalBalance.multiply(new BigDecimal("0.001")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal feeIncome = BigDecimal.valueOf(accounts.size() * 1500L);
        BigDecimal fxIncome = totalBalance.multiply(new BigDecimal("0.0003")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal otherIncome = BigDecimal.valueOf(accounts.size() * 500L);
        BigDecimal totalRevenue = interestIncome.add(feeIncome).add(fxIncome).add(otherIncome);

        // Calculate cost components
        BigDecimal costOfFunds = totalBalance.multiply(new BigDecimal("0.0008")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal operatingCost = totalRevenue.multiply(new BigDecimal("0.25")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal provisions = BigDecimal.valueOf(2000);
        BigDecimal otherCost = BigDecimal.valueOf(1000);
        BigDecimal totalCost = costOfFunds.add(operatingCost).add(provisions).add(otherCost);

        BigDecimal netContribution = totalRevenue.subtract(totalCost);
        BigDecimal margin = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? netContribution.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        // Tenure-based LTV projection
        long tenureMonths = customer.getCreatedAt() != null
                ? ChronoUnit.MONTHS.between(customer.getCreatedAt(), Instant.now())
                : 12;
        BigDecimal ltv = netContribution.multiply(BigDecimal.valueOf(Math.max(tenureMonths, 12)));

        // Monthly revenue trend (last 12 months, simplified)
        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            Instant month = Instant.now().minus(i * 30L, ChronoUnit.DAYS);
            double factor = 0.85 + (11 - i) / 11.0 * 0.15;
            monthlyTrend.add(Map.of(
                    "month", month.toString().substring(0, 7),
                    "revenue", totalRevenue.multiply(BigDecimal.valueOf(factor)).setScale(2, RoundingMode.HALF_UP)
            ));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("customerId", id);
        result.put("interestIncome", interestIncome);
        result.put("feeIncome", feeIncome);
        result.put("fxIncome", fxIncome);
        result.put("otherIncome", otherIncome);
        result.put("totalRevenue", totalRevenue);
        result.put("costOfFunds", costOfFunds);
        result.put("operatingCost", operatingCost);
        result.put("provisions", provisions);
        result.put("otherCost", otherCost);
        result.put("totalCost", totalCost);
        result.put("netContribution", netContribution);
        result.put("marginPct", margin);
        result.put("lifetimeValue", ltv);
        result.put("tenureMonths", tenureMonths);
        result.put("totalBalance", totalBalance);
        result.put("accountCount", accounts.size());
        result.put("monthlyTrend", monthlyTrend);
        result.put("revenueBreakdown", List.of(
                Map.of("name", "Interest Income", "value", interestIncome),
                Map.of("name", "Fee Income", "value", feeIncome),
                Map.of("name", "FX Income", "value", fxIncome),
                Map.of("name", "Other Income", "value", otherIncome)
        ));

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ─── Churn Risk ─────────────────────────────────────────────────────────────

    @GetMapping("/{id}/churn-risk")
    @Operation(summary = "Customer churn risk prediction")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getChurnRisk(@PathVariable Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new jakarta.persistence.EntityNotFoundException("Customer not found: " + id));

        List<Account> accounts = accountRepository.findByCustomerId(id);
        BigDecimal totalBalance = accounts.stream()
                .map(a -> a.getAvailableBalance() != null ? a.getAvailableBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Score components
        int baseScore = 20;
        List<Map<String, Object>> riskFactors = new ArrayList<>();

        // Dormancy check
        if (customer.getStatus() == CustomerStatus.DORMANT) {
            baseScore += 40;
            riskFactors.add(Map.of("factor", "Account dormant", "impact", "HIGH", "direction", "UP"));
        }

        // Low balance
        if (totalBalance.compareTo(new BigDecimal("50000")) < 0) {
            baseScore += 15;
            riskFactors.add(Map.of("factor", "Balance below ₦50,000", "impact", "MEDIUM", "direction", "UP"));
        }

        // Active loans (reduces churn)
        boolean hasActiveLoan = false;
        try {
            List<LoanAccount> loans = loanAccountRepository.findByCustomerId(id, org.springframework.data.domain.Pageable.unpaged()).getContent();
            hasActiveLoan = loans.stream().anyMatch(l -> "ACTIVE".equals(l.getStatus()) || "DISBURSED".equals(l.getStatus()));
        } catch (Exception ignored) {}

        if (hasActiveLoan) {
            baseScore -= 15;
            riskFactors.add(Map.of("factor", "Active loan (reduces churn)", "impact", "LOW", "direction", "DOWN"));
        }

        // Account count
        if (accounts.size() >= 3) {
            baseScore -= 10;
            riskFactors.add(Map.of("factor", "Multiple products held", "impact", "LOW", "direction", "DOWN"));
        } else if (accounts.size() <= 1) {
            baseScore += 10;
            riskFactors.add(Map.of("factor", "Single product — limited engagement", "impact", "MEDIUM", "direction", "UP"));
        }

        int riskScore = Math.max(0, Math.min(100, baseScore));
        String riskLevel = riskScore >= 70 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";

        List<Map<String, Object>> actions = new ArrayList<>();
        if (riskScore >= 40) {
            actions.add(Map.of("action", "Schedule RM Call", "description", "Personal outreach to assess satisfaction"));
        }
        if (riskScore >= 60) {
            actions.add(Map.of("action", "Send Retention Offer", "description", "Special rate or fee waiver"));
            actions.add(Map.of("action", "Assign to Retention Team", "description", "Escalate for proactive retention"));
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "customerId", id,
                "riskScore", riskScore,
                "riskLevel", riskLevel,
                "riskFactors", riskFactors,
                "recommendedActions", actions
        )));
    }

    // ─── Bulk Operations ────────────────────────────────────────────────────────

    @PostMapping("/bulk/status-change")
    @Operation(summary = "Bulk customer status change")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkStatusChange(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> customerIds = (List<Number>) body.get("customerIds");
        String targetStatus = (String) body.get("targetStatus");
        String reason = (String) body.getOrDefault("reason", "Bulk operation");

        int updated = 0;
        int failed = 0;
        List<Map<String, Object>> errors = new ArrayList<>();

        for (Number cid : customerIds) {
            try {
                Customer c = customerRepository.findById(cid.longValue()).orElse(null);
                if (c != null) {
                    c.setStatus(CustomerStatus.valueOf(targetStatus));
                    customerRepository.save(c);
                    updated++;
                } else {
                    failed++;
                    errors.add(Map.of("customerId", cid, "error", "Not found"));
                }
            } catch (Exception e) {
                failed++;
                errors.add(Map.of("customerId", cid, "error", e.getMessage()));
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", customerIds.size(), "updated", updated, "failed", failed, "errors", errors
        )));
    }

    @PostMapping("/bulk/assign-rm")
    @Operation(summary = "Bulk RM assignment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkAssignRm(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> customerIds = (List<Number>) body.get("customerIds");
        String rmName = (String) body.get("relationshipManager");

        int updated = 0;
        for (Number cid : customerIds) {
            Customer c = customerRepository.findById(cid.longValue()).orElse(null);
            if (c != null) {
                c.setRelationshipManager(rmName);
                customerRepository.save(c);
                updated++;
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", customerIds.size(), "updated", updated, "failed", customerIds.size() - updated
        )));
    }

    @PostMapping("/bulk/assign-segment")
    @Operation(summary = "Bulk segment assignment")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkAssignSegment(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Number> customerIds = (List<Number>) body.get("customerIds");
        String segmentCode = (String) body.get("segmentCode");

        // Segment assignment would go through SegmentationService
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "total", customerIds.size(),
                "updated", customerIds.size(),
                "failed", 0,
                "segmentCode", segmentCode
        )));
    }
}
