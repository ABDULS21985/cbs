package com.cbs.gl.islamic.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.gl.entity.ChartOfAccounts;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.islamic.dto.AaoifiBalanceSheet;
import com.cbs.gl.islamic.dto.CreateInvestmentPoolRequest;
import com.cbs.gl.islamic.dto.CreateIslamicGLAccountRequest;
import com.cbs.gl.islamic.dto.IrrAdequacyReport;
import com.cbs.gl.islamic.dto.IrrDashboard;
import com.cbs.gl.islamic.dto.IrrPolicyRequest;
import com.cbs.gl.islamic.dto.IrrReleaseResult;
import com.cbs.gl.islamic.dto.IrrRetentionResult;
import com.cbs.gl.islamic.dto.IslamicGLMetadataRequest;
import com.cbs.gl.islamic.dto.IslamicPostingRequest;
import com.cbs.gl.islamic.dto.PerCalculationRequest;
import com.cbs.gl.islamic.dto.PerCalculationResult;
import com.cbs.gl.islamic.dto.PerDashboard;
import com.cbs.gl.islamic.dto.PerPolicyRequest;
import com.cbs.gl.islamic.dto.PoolParticipantRequest;
import com.cbs.gl.islamic.dto.ReserveOperationRequest;
import com.cbs.gl.islamic.dto.ShariahClassificationUpdateRequest;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.InvestmentPoolParticipant;
import com.cbs.gl.islamic.entity.IslamicPostingRule;
import com.cbs.gl.islamic.entity.IslamicTransactionType;
import com.cbs.gl.islamic.entity.IrrPolicy;
import com.cbs.gl.islamic.entity.IrrTransaction;
import com.cbs.gl.islamic.entity.PerPolicy;
import com.cbs.gl.islamic.entity.PerTransaction;
import com.cbs.gl.islamic.service.IrrService;
import com.cbs.gl.islamic.service.IslamicChartOfAccountsService;
import com.cbs.gl.islamic.service.IslamicGLMetadataService;
import com.cbs.gl.islamic.service.IslamicPostingRuleService;
import com.cbs.gl.islamic.service.PerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/islamic-gl")
@RequiredArgsConstructor
@Tag(name = "Islamic GL", description = "AAOIFI chart of accounts, Islamic GL metadata, investment pools, reserves, and posting rules")
public class IslamicGlController {

    private final IslamicChartOfAccountsService chartService;
    private final IslamicGLMetadataService metadataService;
    private final PerService perService;
    private final IrrService irrService;
    private final IslamicPostingRuleService postingRuleService;

    @PostMapping("/accounts")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<ChartOfAccounts>> createIslamicGlAccount(
            @Valid @RequestBody CreateIslamicGLAccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(chartService.createIslamicGLAccount(request)));
    }

    @GetMapping("/accounts")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> listIslamicAccounts(
            @RequestParam(required = false) IslamicAccountCategory category,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Long pool) {
        if (category != null) {
            return ResponseEntity.ok(ApiResponse.ok(chartService.getAccountsByIslamicCategory(category)));
        }
        if (contractType != null) {
            return ResponseEntity.ok(ApiResponse.ok(chartService.getAccountsByContractType(contractType)));
        }
        if (pool != null) {
            return ResponseEntity.ok(ApiResponse.ok(chartService.getIslamicAccounts().stream()
                    .filter(account -> pool.equals(account.getInvestmentPoolId()))
                    .toList()));
        }
        return ResponseEntity.ok(ApiResponse.ok(chartService.getIslamicAccounts()));
    }

    @GetMapping("/accounts/category/{category}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getAccountsByCategory(@PathVariable IslamicAccountCategory category) {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getAccountsByIslamicCategory(category)));
    }

    @GetMapping("/accounts/contract-type/{code}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getAccountsByContractType(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getAccountsByContractType(code)));
    }

    @GetMapping("/accounts/grouped")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<IslamicAccountCategory, List<ChartOfAccounts>>>> getGroupedChart() {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getIslamicChartGroupedByCategory()));
    }

    @GetMapping("/accounts/{code}/metadata")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ChartOfAccounts>> getMetadata(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getMetadata(code)));
    }

    @PutMapping("/accounts/{code}/metadata")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<ChartOfAccounts>> setMetadata(
            @PathVariable String code,
            @RequestBody IslamicGLMetadataRequest request) {
        metadataService.setMetadata(code, request);
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getMetadata(code)));
    }

    @PatchMapping("/accounts/{code}/shariah-classification")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','SHARIAH_OFFICER','SHARIAH_BOARD')")
    public ResponseEntity<ApiResponse<ChartOfAccounts>> updateShariahClassification(
            @PathVariable String code,
            @RequestBody ShariahClassificationUpdateRequest request) {
        metadataService.updateShariahClassification(code, request.getClassification(), request.getReviewedBy());
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getMetadata(code)));
    }

    @GetMapping("/accounts/shariah-review-due")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getAccountsDueForReview() {
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getAccountsUnderShariahReview()));
    }

    @GetMapping("/accounts/purification-required")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getAccountsRequiringPurification() {
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getAccountsRequiringPurification()));
    }

    @GetMapping("/accounts/zakat-applicable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ChartOfAccounts>>> getZakatApplicableAccounts() {
        return ResponseEntity.ok(ApiResponse.ok(metadataService.getZakatApplicableAccounts()));
    }

    @GetMapping("/resolve/financing-receivable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> resolveFinancingReceivable(
            @RequestParam String contractType,
            @RequestParam(required = false) String currency) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "glCode", metadataService.resolveFinancingReceivableAccount(contractType, currency))));
    }

    @GetMapping("/resolve/income")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, String>>> resolveIncomeAccount(@RequestParam String contractType) {
        return ResponseEntity.ok(ApiResponse.ok(Map.of("glCode", metadataService.resolveIncomeAccount(contractType))));
    }

    @GetMapping("/balance-sheet")
    @Operation(summary = "Generate AAOIFI balance sheet")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE')")
    public ResponseEntity<ApiResponse<AaoifiBalanceSheet>> getBalanceSheet(@RequestParam(required = false) LocalDate asOf) {
        return ResponseEntity.ok(ApiResponse.ok(chartService.generateAaoifiBalanceSheet(asOf)));
    }

    @PostMapping("/pools")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY')")
    public ResponseEntity<ApiResponse<InvestmentPool>> createPool(@Valid @RequestBody CreateInvestmentPoolRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(chartService.createPool(request)));
    }

    @GetMapping("/pools")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','FINANCE')")
    public ResponseEntity<ApiResponse<List<InvestmentPool>>> listPools() {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getPools()));
    }

    @GetMapping("/pools/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','FINANCE')")
    public ResponseEntity<ApiResponse<InvestmentPool>> getPool(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getPoolByCode(poolCode)));
    }

    @GetMapping("/pools/{poolCode}/participants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InvestmentPoolParticipant>>> getPoolParticipants(@PathVariable String poolCode) {
        return ResponseEntity.ok(ApiResponse.ok(chartService.getPoolParticipants(chartService.getPoolByCode(poolCode).getId())));
    }

    @PostMapping("/pools/{poolCode}/participants")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<InvestmentPoolParticipant>>> addParticipant(
            @PathVariable String poolCode,
            @Valid @RequestBody PoolParticipantRequest request) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        chartService.addParticipant(pool.getId(), request.getAccountId(), request.getAmount());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(chartService.getPoolParticipants(pool.getId())));
    }

    @DeleteMapping("/pools/{poolCode}/participants/{accountId}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> removeParticipant(
            @PathVariable String poolCode,
            @PathVariable Long accountId,
            @RequestParam(required = false) String reason) {
        chartService.removeParticipant(chartService.getPoolByCode(poolCode).getId(), accountId, reason);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/pools/{poolCode}/balance")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','TREASURY','FINANCE')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getPoolBalance(@PathVariable String poolCode) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("balance", chartService.getPoolBalance(pool.getId()))));
    }

    @PostMapping("/per/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<PerPolicy>> createPerPolicy(@Valid @RequestBody PerPolicyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(perService.createPolicy(request)));
    }

    @GetMapping("/per/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<List<PerPolicy>>> listPerPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(perService.getActivePolicies()));
    }

    @GetMapping("/per/policies/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<PerPolicy>> getPerPolicy(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(perService.getPolicy(id)));
    }

    @PutMapping("/per/policies/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<PerPolicy>> updatePerPolicy(@PathVariable Long id, @RequestBody PerPolicyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(perService.updatePolicy(id, request)));
    }

    @PostMapping("/per/calculate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<PerCalculationResult>> calculatePer(@Valid @RequestBody PerCalculationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(perService.calculatePerAdjustment(
                request.getPoolId(), request.getGrossProfit(), request.getPeriodFrom(), request.getPeriodTo())));
    }

    @PostMapping("/per/retain")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<Void>> retainToPer(@RequestBody ReserveOperationRequest request) {
        perService.retainToPer(request.getPoolId(), request.getAmount(), request.getPeriodFrom(), request.getPeriodTo(),
                request.getGrossProfit(), request.getActualRate(), request.getSmoothedRate());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/per/release")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> releaseFromPer(@RequestBody ReserveOperationRequest request) {
        perService.releaseFromPer(request.getPoolId(), request.getAmount(), request.getPeriodFrom(), request.getPeriodTo(),
                request.getGrossProfit(), request.getActualRate(), request.getSmoothedRate(), request.getApprovedBy());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/per/balance/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getPerBalance(@PathVariable String poolCode) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("balance", perService.getPerBalance(pool.getId()))));
    }

    @GetMapping("/per/history/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<List<PerTransaction>>> getPerHistory(
            @PathVariable String poolCode,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(perService.getPerHistory(pool.getId(), from, to)));
    }

    @GetMapping("/per/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<PerDashboard>> getPerDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(perService.getPerDashboard()));
    }

    @PostMapping("/irr/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IrrPolicy>> createIrrPolicy(@Valid @RequestBody IrrPolicyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(irrService.createPolicy(request)));
    }

    @GetMapping("/irr/policies")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<List<IrrPolicy>>> listIrrPolicies() {
        return ResponseEntity.ok(ApiResponse.ok(irrService.getActivePolicies()));
    }

    @GetMapping("/irr/policies/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<IrrPolicy>> getIrrPolicy(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(irrService.getPolicy(id)));
    }

    @PutMapping("/irr/policies/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IrrPolicy>> updateIrrPolicy(@PathVariable Long id, @RequestBody IrrPolicyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(irrService.updatePolicy(id, request)));
    }

    @PostMapping("/irr/calculate-retention")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<IrrRetentionResult>> calculateIrrRetention(@RequestBody ReserveOperationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(irrService.calculateIrrRetention(
                request.getPoolId(), request.getAmount(), request.getPeriodFrom(), request.getPeriodTo())));
    }

    @PostMapping("/irr/retain")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<Void>> retainToIrr(@RequestBody ReserveOperationRequest request) {
        irrService.retainToIrr(request.getPoolId(), request.getAmount(), request.getPeriodFrom(), request.getPeriodTo());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/irr/release-for-loss")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> releaseIrrForLoss(@RequestBody ReserveOperationRequest request) {
        irrService.releaseIrrForLossAbsorption(request.getPoolId(), request.getAmount(), request.getTriggerEvent(), request.getApprovedBy());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/irr/release-on-closure")
    @PreAuthorize("hasAnyRole('FINANCE','TREASURY','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<Void>> releaseIrrOnClosure(@RequestBody ReserveOperationRequest request) {
        irrService.releaseIrrOnPoolClosure(request.getPoolId(), request.getTriggerEvent());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/irr/balance/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getIrrBalance(@PathVariable String poolCode) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("balance", irrService.getIrrBalance(pool.getId()))));
    }

    @GetMapping("/irr/history/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<List<IrrTransaction>>> getIrrHistory(
            @PathVariable String poolCode,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(irrService.getIrrHistory(pool.getId(), from, to)));
    }

    @GetMapping("/irr/dashboard")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<IrrDashboard>> getIrrDashboard() {
        return ResponseEntity.ok(ApiResponse.ok(irrService.getIrrDashboard()));
    }

    @GetMapping("/irr/adequacy/{poolCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE','TREASURY','COMPLIANCE','SHARIAH_BOARD','SHARIAH_OFFICER')")
    public ResponseEntity<ApiResponse<IrrAdequacyReport>> getIrrAdequacy(@PathVariable String poolCode) {
        InvestmentPool pool = chartService.getPoolByCode(poolCode);
        return ResponseEntity.ok(ApiResponse.ok(irrService.getIrrAdequacy(pool.getId())));
    }

    @PostMapping("/posting-rules")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicPostingRule>> createPostingRule(@RequestBody IslamicPostingRule request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(postingRuleService.createRule(request)));
    }

    @GetMapping("/posting-rules")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<IslamicPostingRule>>> listPostingRules(
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) IslamicTransactionType txnType) {
        if (contractType != null) {
            return ResponseEntity.ok(ApiResponse.ok(postingRuleService.getRulesByContractType(contractType)));
        }
        if (txnType != null) {
            return ResponseEntity.ok(ApiResponse.ok(postingRuleService.getRulesByTransactionType(txnType)));
        }
        return ResponseEntity.ok(ApiResponse.ok(postingRuleService.getAllRules()));
    }

    @GetMapping("/posting-rules/{ruleCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IslamicPostingRule>> getPostingRule(@PathVariable String ruleCode) {
        return ResponseEntity.ok(ApiResponse.ok(postingRuleService.getRuleByCode(ruleCode)));
    }

    @PutMapping("/posting-rules/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<IslamicPostingRule>> updatePostingRule(
            @PathVariable Long id,
            @RequestBody IslamicPostingRule request) {
        return ResponseEntity.ok(ApiResponse.ok(postingRuleService.updateRule(id, request)));
    }

    @PostMapping("/posting-rules/resolve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<IslamicPostingRule>> resolvePostingRule(@RequestBody IslamicPostingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                postingRuleService.resolveRule(request.getContractTypeCode(), request.getTxnType(), Map.of("transaction", request, "valueDate", request.getValueDate()))));
    }

    @PostMapping("/post")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<Object>> postIslamicTransaction(@Valid @RequestBody IslamicPostingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(postingRuleService.postIslamicTransaction(request)));
    }

    @PostMapping("/preview")
    @PreAuthorize("hasAnyRole('CBS_OFFICER','FINANCE','TREASURY')")
    public ResponseEntity<ApiResponse<Object>> previewIslamicTransaction(@Valid @RequestBody IslamicPostingRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(postingRuleService.generateJournalEntries(request)));
    }
}
