package com.cbs.risk.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.credit.entity.CreditScoringModel;
import com.cbs.credit.repository.CreditScoringModelRepository;
import com.cbs.ecl.entity.EclCalculation;
import com.cbs.ecl.repository.EclCalculationRepository;
import com.cbs.lending.entity.LoanAccount;
import com.cbs.lending.entity.LoanAccountStatus;
import com.cbs.lending.repository.LoanAccountRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/v1/credit-risk")
@RequiredArgsConstructor
@Tag(name = "Credit Risk Dashboard", description = "Credit risk metrics, NPL trends, rating distribution, concentration analysis")
public class CreditRiskDashboardController {

    private final LoanAccountRepository loanAccountRepository;
    private final EclCalculationRepository eclCalculationRepository;
    private final CreditScoringModelRepository creditScoringModelRepository;

    @GetMapping("/stats")
    @Operation(summary = "Credit risk summary: total exposure, NPL, provisions, coverage ratio")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        BigDecimal totalExposure = activeLoans.stream()
                .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<LoanAccount> nplLoans = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                .collect(Collectors.toList());

        BigDecimal nplAmount = nplLoans.stream()
                .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProvisions = activeLoans.stream()
                .map(l -> l.getProvisionAmount() != null ? l.getProvisionAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal nplRatio = totalExposure.compareTo(BigDecimal.ZERO) > 0 ?
                nplAmount.multiply(new BigDecimal("100")).divide(totalExposure, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal coverageRatio = nplAmount.compareTo(BigDecimal.ZERO) > 0 ?
                totalProvisions.multiply(new BigDecimal("100")).divide(nplAmount, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalExposure", totalExposure);
        stats.put("totalActiveLoans", activeLoans.size());
        stats.put("nplAmount", nplAmount);
        stats.put("nplCount", nplLoans.size());
        stats.put("nplRatio", nplRatio);
        stats.put("totalProvisions", totalProvisions);
        stats.put("coverageRatio", coverageRatio);

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }

    @GetMapping("/rating-distribution")
    @Operation(summary = "Loans by internal rating (IFRS9 stage)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRatingDistribution() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        Map<Integer, List<LoanAccount>> byStage = activeLoans.stream()
                .collect(Collectors.groupingBy(l -> l.getIfrs9Stage() != null ? l.getIfrs9Stage() : 1));

        List<Map<String, Object>> distribution = new ArrayList<>();
        for (Map.Entry<Integer, List<LoanAccount>> entry : new TreeMap<>(byStage).entrySet()) {
            BigDecimal stageExposure = entry.getValue().stream()
                    .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            distribution.add(Map.of(
                    "stage", entry.getKey(),
                    "loanCount", entry.getValue().size(),
                    "totalExposure", stageExposure
            ));
        }

        return ResponseEntity.ok(ApiResponse.ok(distribution));
    }

    @GetMapping("/rating-migration")
    @Operation(summary = "Rating stage changes over time from ECL calculations")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRatingMigration() {
        // Use latest ECL calculation date
        Page<EclCalculation> latestPage = eclCalculationRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "calculationDate")));

        if (latestPage.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        LocalDate latestDate = latestPage.getContent().get(0).getCalculationDate();
        List<Object[]> migrations = eclCalculationRepository.stageMigration(latestDate);

        List<Map<String, Object>> result = migrations.stream()
                .map(row -> Map.<String, Object>of(
                        "fromStage", row[0],
                        "toStage", row[1],
                        "amount", row[2]
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/concentration/sector")
    @Operation(summary = "Sector exposure concentration from ECL segments")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSectorConcentration() {
        Page<EclCalculation> latestPage = eclCalculationRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "calculationDate")));

        if (latestPage.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        LocalDate latestDate = latestPage.getContent().get(0).getCalculationDate();
        List<Object[]> segments = eclCalculationRepository.eadBySegment(latestDate);

        List<Map<String, Object>> result = segments.stream()
                .map(row -> Map.<String, Object>of(
                        "sector", row[0] != null ? row[0] : "UNCLASSIFIED",
                        "totalExposure", row[1]
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/concentration/product")
    @Operation(summary = "Product concentration from loan accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProductConcentration() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        Map<String, List<LoanAccount>> byProduct = activeLoans.stream()
                .collect(Collectors.groupingBy(l ->
                        l.getLoanProduct() != null ? l.getLoanProduct().getName() : "Unknown"));

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<LoanAccount>> entry : byProduct.entrySet()) {
            BigDecimal exposure = entry.getValue().stream()
                    .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(Map.of(
                    "product", entry.getKey(),
                    "loanCount", entry.getValue().size(),
                    "totalExposure", exposure
            ));
        }
        result.sort((a, b) -> ((BigDecimal) b.get("totalExposure")).compareTo((BigDecimal) a.get("totalExposure")));

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/concentration/rating")
    @Operation(summary = "Rating concentration from loan accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRatingConcentration() {
        Page<EclCalculation> latestPage = eclCalculationRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "calculationDate")));

        if (latestPage.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }

        LocalDate latestDate = latestPage.getContent().get(0).getCalculationDate();
        List<Object[]> stages = eclCalculationRepository.stageDistribution(latestDate);

        List<Map<String, Object>> result = stages.stream()
                .map(row -> Map.<String, Object>of(
                        "stage", row[0],
                        "count", row[1],
                        "totalEcl", row[2]
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/npl-trend")
    @Operation(summary = "Monthly NPL trend from loan accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getNplTrend() {
        // Use ECL calculation dates to track NPL trend
        List<EclCalculation> allCalcs = eclCalculationRepository.findAll(
                Sort.by(Sort.Direction.ASC, "calculationDate"));

        Map<String, List<EclCalculation>> byMonth = allCalcs.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getCalculationDate().withDayOfMonth(1).toString(),
                        TreeMap::new,
                        Collectors.toList()));

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<String, List<EclCalculation>> entry : byMonth.entrySet()) {
            long nplCount = entry.getValue().stream()
                    .filter(c -> c.getDaysPastDue() != null && c.getDaysPastDue() > 90)
                    .count();
            BigDecimal nplEcl = entry.getValue().stream()
                    .filter(c -> c.getDaysPastDue() != null && c.getDaysPastDue() > 90)
                    .map(c -> c.getEclWeighted() != null ? c.getEclWeighted() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            trend.add(Map.of(
                    "month", entry.getKey(),
                    "nplCount", nplCount,
                    "nplEcl", nplEcl,
                    "totalCalculations", entry.getValue().size()
            ));
        }

        return ResponseEntity.ok(ApiResponse.ok(trend));
    }

    @GetMapping("/watch-list")
    @Operation(summary = "Loans on watch list (DPD > 30)")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getWatchList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        List<Map<String, Object>> watchList = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 30)
                .sorted(Comparator.comparingInt(LoanAccount::getDaysPastDue).reversed())
                .skip((long) page * size)
                .limit(size)
                .map(l -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("loanNumber", l.getLoanNumber());
                    m.put("outstandingPrincipal", l.getOutstandingPrincipal());
                    m.put("daysPastDue", l.getDaysPastDue());
                    m.put("delinquencyBucket", l.getDelinquencyBucket());
                    m.put("ifrs9Stage", l.getIfrs9Stage());
                    m.put("provisionAmount", l.getProvisionAmount());
                    m.put("status", l.getStatus().name());
                    m.put("branchCode", l.getBranchCode());
                    m.put("relationshipManager", l.getRelationshipManager());
                    return m;
                })
                .collect(Collectors.toList());

        long totalWatchList = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 30)
                .count();

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "watchList", watchList,
                "totalCount", totalWatchList
        )));
    }

    @GetMapping("/single-obligors")
    @Operation(summary = "Top 20 single borrower exposures")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSingleObligors() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        // Group by customer and sum exposure
        Map<Long, BigDecimal> customerExposure = new HashMap<>();
        Map<Long, List<LoanAccount>> customerLoans = new HashMap<>();
        for (LoanAccount loan : activeLoans) {
            Long customerId = loan.getCustomer() != null ? loan.getCustomer().getId() : null;
            if (customerId != null) {
                customerExposure.merge(customerId,
                        loan.getOutstandingPrincipal() != null ? loan.getOutstandingPrincipal() : BigDecimal.ZERO,
                        BigDecimal::add);
                customerLoans.computeIfAbsent(customerId, k -> new ArrayList<>()).add(loan);
            }
        }

        List<Map<String, Object>> result = customerExposure.entrySet().stream()
                .sorted(Map.Entry.<Long, BigDecimal>comparingByValue().reversed())
                .limit(20)
                .map(entry -> {
                    List<LoanAccount> loans = customerLoans.get(entry.getKey());
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("customerId", entry.getKey());
                    m.put("totalExposure", entry.getValue());
                    m.put("loanCount", loans.size());
                    m.put("maxDpd", loans.stream()
                            .mapToInt(l -> l.getDaysPastDue() != null ? l.getDaysPastDue() : 0)
                            .max().orElse(0));
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/scorecards")
    @Operation(summary = "Active credit scoring models")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CreditScoringModel>>> getScorecards() {
        return ResponseEntity.ok(ApiResponse.ok(creditScoringModelRepository.findByIsActiveTrueOrderByModelNameAsc()));
    }

    @GetMapping("/committee-pack")
    @Operation(summary = "Credit committee summary pack")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCommitteePack() {
        List<LoanAccount> activeLoans = loanAccountRepository.findAllActiveLoans();

        BigDecimal totalExposure = activeLoans.stream()
                .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long nplCount = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                .count();

        BigDecimal nplAmount = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 90)
                .map(l -> l.getOutstandingPrincipal() != null ? l.getOutstandingPrincipal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalProvisions = activeLoans.stream()
                .map(l -> l.getProvisionAmount() != null ? l.getProvisionAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long watchListCount = activeLoans.stream()
                .filter(l -> l.getDaysPastDue() != null && l.getDaysPastDue() > 30)
                .count();

        // Stage distribution
        Map<Integer, Long> stageCount = activeLoans.stream()
                .collect(Collectors.groupingBy(
                        l -> l.getIfrs9Stage() != null ? l.getIfrs9Stage() : 1,
                        Collectors.counting()));

        // ECL summary
        Page<EclCalculation> latestEcl = eclCalculationRepository.findAll(
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "calculationDate")));
        BigDecimal totalEcl = BigDecimal.ZERO;
        if (!latestEcl.isEmpty()) {
            LocalDate eclDate = latestEcl.getContent().get(0).getCalculationDate();
            BigDecimal ecl = eclCalculationRepository.totalEclForDate(eclDate);
            totalEcl = ecl != null ? ecl : BigDecimal.ZERO;
        }

        Map<String, Object> pack = new LinkedHashMap<>();
        pack.put("reportDate", LocalDate.now().toString());
        pack.put("totalActiveLoans", activeLoans.size());
        pack.put("totalExposure", totalExposure);
        pack.put("nplCount", nplCount);
        pack.put("nplAmount", nplAmount);
        pack.put("nplRatio", totalExposure.compareTo(BigDecimal.ZERO) > 0 ?
                nplAmount.multiply(new BigDecimal("100")).divide(totalExposure, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        pack.put("totalProvisions", totalProvisions);
        pack.put("coverageRatio", nplAmount.compareTo(BigDecimal.ZERO) > 0 ?
                totalProvisions.multiply(new BigDecimal("100")).divide(nplAmount, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO);
        pack.put("watchListCount", watchListCount);
        pack.put("stageDistribution", stageCount);
        pack.put("totalEcl", totalEcl);
        pack.put("activeScoringModels", creditScoringModelRepository.findByIsActiveTrueOrderByModelNameAsc().size());

        return ResponseEntity.ok(ApiResponse.ok(pack));
    }
}
