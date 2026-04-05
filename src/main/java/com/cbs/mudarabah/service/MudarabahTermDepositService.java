package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.dto.CreateMudarabahTermDepositRequest;
import com.cbs.mudarabah.dto.MudarabahTDPortfolioSummary;
import com.cbs.mudarabah.dto.MudarabahTermDepositResponse;
import com.cbs.mudarabah.entity.EarlyWithdrawalPenalty;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahMaturityInstruction;
import com.cbs.mudarabah.entity.MudarabahTDStatus;
import com.cbs.mudarabah.entity.MudarabahTermDeposit;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.PreferredLanguage;
import com.cbs.mudarabah.entity.ProfitDistributionFrequency;
import com.cbs.mudarabah.entity.StatementFrequency;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.MudarabahTermDepositRepository;
import com.cbs.mudarabah.repository.PoolProfitAllocationRepository;
import com.cbs.mudarabah.entity.PoolProfitAllocation;
import com.cbs.mudarabah.entity.ProfitAllocationStatus;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.repository.InvestmentPoolRepository;
import com.cbs.rulesengine.dto.DecisionResultResponse;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cbs.mudarabah.dto.MudarabahTDSearchCriteria;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MudarabahTermDepositService {

    private final MudarabahTermDepositRepository termDepositRepository;
    private final MudarabahAccountRepository mudarabahAccountRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;
    private final DecisionTableEvaluator decisionTableEvaluator;
    private final HijriCalendarService hijriCalendarService;
    private final PoolProfitAllocationRepository allocationRepository;
    private final CustomerRepository customerRepository;
    private final InvestmentPoolRepository investmentPoolRepository;

    private static final String MUDARABAH_INVESTMENT_GL = "3100-MDR-001";
    private static final String PROFIT_DISTRIBUTION_GL = "6100-000-001";
    private static final String BANK_MUDARIB_INCOME_GL = "4200-MDR-001";
    private static final AtomicLong TD_SEQ = new AtomicLong(System.currentTimeMillis() % 100000);

    public MudarabahTermDepositResponse createTermDeposit(CreateMudarabahTermDepositRequest request) {
        // Idempotency check: if an external reference is provided, check for duplicate
        if (request.getExternalReference() != null && !request.getExternalReference().isBlank()) {
            var existing = termDepositRepository.findByExternalReference(request.getExternalReference());
            if (existing.isPresent()) {
                log.info("Duplicate term deposit creation detected for externalReference={}, returning existing TD {}",
                        request.getExternalReference(), existing.get().getDepositRef());
                return toResponse(existing.get());
            }
        }

        // 1. Validate loss disclosure
        if (!request.isLossDisclosureAccepted()) {
            throw new BusinessException("Loss disclosure must be accepted", "LOSS_DISCLOSURE_REQUIRED");
        }

        // Product limits validation
        BigDecimal minAmount = new BigDecimal("10000"); // Default minimum for TD
        BigDecimal maxAmount = new BigDecimal("50000000"); // Default maximum
        int minTenorDays = 30;
        int maxTenorDays = 1800; // 5 years

        if (request.getPrincipalAmount().compareTo(minAmount) < 0) {
            throw new BusinessException("Principal amount " + request.getPrincipalAmount()
                    + " is below minimum of " + minAmount + " for term deposits", "BELOW_MINIMUM_AMOUNT");
        }
        if (request.getPrincipalAmount().compareTo(maxAmount) > 0) {
            throw new BusinessException("Principal amount " + request.getPrincipalAmount()
                    + " exceeds maximum of " + maxAmount + " for term deposits", "EXCEEDS_MAXIMUM_AMOUNT");
        }
        if (request.getTenorDays() < minTenorDays) {
            throw new BusinessException("Tenor " + request.getTenorDays()
                    + " days is below minimum of " + minTenorDays + " days", "BELOW_MINIMUM_TENOR");
        }
        if (request.getTenorDays() > maxTenorDays) {
            throw new BusinessException("Tenor " + request.getTenorDays()
                    + " days exceeds maximum of " + maxTenorDays + " days", "EXCEEDS_MAXIMUM_TENOR");
        }

        // 2. Determine PSR - from request, or decision table, or default
        BigDecimal psrCustomer = request.getProfitSharingRatioCustomer();
        BigDecimal psrBank = request.getProfitSharingRatioBank();
        if (psrCustomer == null || psrBank == null) {
            // Try decision table lookup
            try {
                Map<String, Object> inputs = new HashMap<>();
                inputs.put("tenor_months", request.getTenorDays() / 30);
                inputs.put("amount", request.getPrincipalAmount());
                inputs.put("customer_segment", "RETAIL"); // default
                DecisionResultResponse dtResult = decisionTableEvaluator.evaluateByRuleCode("MDR_TD_PSR_BY_TENOR", inputs);
                if (Boolean.TRUE.equals(dtResult.getMatched())) {
                    Map<String, Object> outputs = dtResult.getOutputs();
                    if (outputs.containsKey("psr_customer") && outputs.containsKey("psr_bank")) {
                        psrCustomer = new BigDecimal(outputs.get("psr_customer").toString());
                        psrBank = new BigDecimal(outputs.get("psr_bank").toString());
                    }
                }
            } catch (Exception e) {
                log.error("PSR decision table lookup failed for MDR_TD_PSR_BY_TENOR with inputs tenor={}, amount={}: {}",
                        request.getTenorDays() / 30, request.getPrincipalAmount(), e.getMessage());
                // Fall through to use defaults — but log at ERROR not WARN
            }
            if (psrCustomer == null || psrBank == null) {
                psrCustomer = new BigDecimal("70.0000");
                psrBank = new BigDecimal("30.0000");
            }
        }
        // Validate PSR
        validatePsr(psrCustomer, psrBank);

        // 3. Calculate maturity date
        LocalDate startDate = LocalDate.now();
        LocalDate maturityDate = startDate.plusDays(request.getTenorDays());
        // Adjust for business days
        try {
            if (!hijriCalendarService.isIslamicBusinessDay(maturityDate)) {
                maturityDate = hijriCalendarService.getNextIslamicBusinessDay(maturityDate);
            }
        } catch (Exception e) {
            log.warn("Hijri business day check failed, using raw date", e);
        }

        // 4. Convert to Hijri
        String hijriDate = null;
        try {
            var hijriResponse = hijriCalendarService.toHijri(maturityDate);
            hijriDate = hijriResponse != null ? hijriResponse.toString() : null;
        } catch (Exception e) {
            log.warn("Hijri conversion failed", e);
        }

        // 5. Fund from source account
        Account fundingAccount = accountRepository.findById(request.getFundingAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Funding account not found: " + request.getFundingAccountId()));
        if (!fundingAccount.hasSufficientBalance(request.getPrincipalAmount())) {
            throw new BusinessException("Insufficient balance in funding account", "INSUFFICIENT_BALANCE");
        }

        // 6. Create base Account for the TD with customer link
        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId()).orElse(null);
        }
        Account tdAccount = Account.builder()
                .accountNumber("MDRTD" + System.currentTimeMillis() % 10000000000L)
                .accountName("Mudarabah Term Deposit")
                .currencyCode(request.getCurrencyCode())
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .maturityDate(maturityDate)
                .build();
        if (customer != null) {
            tdAccount.setCustomer(customer);
        }
        tdAccount = accountRepository.save(tdAccount);

        // 7. Create MudarabahAccount extension
        String contractRef = "MDR-TD-" + LocalDate.now().getYear() + "-" + String.format("%06d", TD_SEQ.incrementAndGet());
        MudarabahAccount mudarabahAccount = MudarabahAccount.builder()
                .account(tdAccount)
                .contractReference(contractRef)
                .contractSignedDate(LocalDate.now())
                .contractVersion(1)
                .contractTypeCode("MUDARABAH")
                .mudarabahType(request.getMudarabahType() != null ? request.getMudarabahType() : MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.TERM_DEPOSIT)
                .profitSharingRatioCustomer(psrCustomer)
                .profitSharingRatioBank(psrBank)
                .psrAgreedAt(LocalDateTime.now())
                .psrAgreedVersion(1)
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .profitReinvest(false)
                .lossExposure(true)
                .lossDisclosureAccepted(true)
                .lossDisclosureDate(LocalDate.now())
                .zakatApplicable(true)
                .earlyWithdrawalAllowed(request.isEarlyWithdrawalAllowed())
                .tenorDays(request.getTenorDays())
                .maturityDate(maturityDate)
                .maturityInstruction(MudarabahMaturityInstruction.valueOf(request.getMaturityInstruction()))
                .rolloverCount(0)
                .lastActivityDate(LocalDate.now())
                .preferredLanguage(PreferredLanguage.EN)
                .statementFrequency(StatementFrequency.MONTHLY)
                .build();
        mudarabahAccount = mudarabahAccountRepository.save(mudarabahAccount);

        // 8. Create MudarabahTermDeposit
        MudarabahTermDeposit td = MudarabahTermDeposit.builder()
                .mudarabahAccount(mudarabahAccount)
                .depositRef(contractRef)
                .principalAmount(request.getPrincipalAmount())
                .currencyCode(request.getCurrencyCode())
                .tenorDays(request.getTenorDays())
                .tenorMonths(request.getTenorDays() / 30)
                .startDate(startDate)
                .maturityDate(maturityDate)
                .maturityDateHijri(hijriDate)
                .psrCustomer(psrCustomer)
                .psrBank(psrBank)
                .profitDistributionFrequency(request.getProfitDistributionFrequency() != null
                        ? ProfitDistributionFrequency.valueOf(request.getProfitDistributionFrequency())
                        : ProfitDistributionFrequency.AT_MATURITY)
                .accumulatedProfit(BigDecimal.ZERO)
                .estimatedMaturityAmount(calculateEstimatedMaturity(request.getPrincipalAmount(), request.getTenorDays()))
                .maturityInstruction(MudarabahMaturityInstruction.valueOf(request.getMaturityInstruction()))
                .payoutAccountId(request.getPayoutAccountId())
                .autoRenew(request.isAutoRenew())
                .renewalPsrCustomer(request.getRenewalPsrCustomer())
                .renewalPsrBank(request.getRenewalPsrBank())
                .renewalTenorDays(request.getRenewalTenorDays())
                .rolloverCount(0)
                .earlyWithdrawalAllowed(request.isEarlyWithdrawalAllowed())
                .status(MudarabahTDStatus.ACTIVE)
                .hasLien(false)
                .build();
        td = termDepositRepository.save(td);

        // 9. GL: Transfer from funding account to TD account
        accountPostingService.postTransfer(
                fundingAccount, tdAccount,
                request.getPrincipalAmount(), request.getPrincipalAmount(),
                "Fund Mudarabah term deposit " + contractRef,
                "Mudarabah TD funding " + contractRef,
                TransactionChannel.SYSTEM, contractRef,
                "MUDARABAH", contractRef
        );

        log.info("Mudarabah TD created: ref={}, principal={}, tenor={}d, PSR={}:{}",
                contractRef, request.getPrincipalAmount(), request.getTenorDays(), psrCustomer, psrBank);
        log.info("AUDIT: Term deposit created - ref={}, principal={}, tenor={}, PSR={}:{}, actor={}",
                contractRef, request.getPrincipalAmount(), request.getTenorDays(), psrCustomer, psrBank,
                "SYSTEM");

        return toResponse(td);
    }

    public MudarabahTermDepositResponse processMaturity(Long termDepositId) {
        MudarabahTermDeposit td = termDepositRepository.findById(termDepositId)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found: " + termDepositId));

        if (td.getStatus() != MudarabahTDStatus.ACTIVE) {
            throw new BusinessException("Term deposit is not active", "TD_NOT_ACTIVE");
        }

        Account tdAccount = td.getMudarabahAccount().getAccount();
        BigDecimal principal = td.getPrincipalAmount();
        BigDecimal profit = td.getAccumulatedProfit() != null ? td.getAccumulatedProfit() : BigDecimal.ZERO;

        // Look up ACTUAL distributed profit from pool allocations (not just accumulated)
        BigDecimal actualProfit = BigDecimal.ZERO;
        try {
            List<PoolProfitAllocation> allocations = allocationRepository
                    .findByAccountIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqual(
                            tdAccount.getId(), td.getStartDate(), LocalDate.now());
            actualProfit = allocations.stream()
                    .filter(a -> a.getDistributionStatus() == ProfitAllocationStatus.DISTRIBUTED)
                    .map(PoolProfitAllocation::getCustomerProfitShare)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (actualProfit.compareTo(BigDecimal.ZERO) > 0) {
                profit = actualProfit; // Use actual distributed profit instead of accumulated
            }
        } catch (Exception e) {
            log.warn("Could not load actual profit allocations for TD {}, using accumulated: {}",
                    td.getDepositRef(), e.getMessage());
        }

        BigDecimal totalAmount = principal.add(profit);

        td.setActualMaturityAmount(totalAmount);
        td.setMaturedAt(LocalDate.now());
        td.setPoolExitDate(LocalDate.now());

        MudarabahMaturityInstruction instruction = td.getMaturityInstruction();
        switch (instruction) {
            case ROLLOVER_PRINCIPAL -> {
                // Pay profit, rollover principal
                if (profit.compareTo(BigDecimal.ZERO) > 0 && td.getPayoutAccountId() != null) {
                    Account payoutAccount = accountRepository.findById(td.getPayoutAccountId())
                            .orElseThrow(() -> new ResourceNotFoundException("Payout account not found"));
                    accountPostingService.postTransfer(tdAccount, payoutAccount,
                            profit, profit,
                            "Mudarabah TD profit payout " + td.getDepositRef(),
                            "Mudarabah TD profit received " + td.getDepositRef(),
                            TransactionChannel.SYSTEM, td.getDepositRef() + ":PROFIT",
                            "MUDARABAH", td.getDepositRef());
                }
                // Create new TD for rollover BEFORE marking original as rolled over
                CreateMudarabahTermDepositRequest rolloverRequest = CreateMudarabahTermDepositRequest.builder()
                        .customerId(td.getMudarabahAccount().getAccount().getCustomer() != null
                                ? td.getMudarabahAccount().getAccount().getCustomer().getId() : null)
                        .productCode(td.getMudarabahAccount().getContractTypeCode())
                        .currencyCode(td.getCurrencyCode())
                        .principalAmount(td.getPrincipalAmount())
                        .tenorDays(td.getRenewalTenorDays() != null ? td.getRenewalTenorDays() : td.getTenorDays())
                        .fundingAccountId(tdAccount.getId())
                        .mudarabahType(td.getMudarabahAccount().getMudarabahType())
                        .profitSharingRatioCustomer(td.getRenewalPsrCustomer() != null ? td.getRenewalPsrCustomer() : td.getPsrCustomer())
                        .profitSharingRatioBank(td.getRenewalPsrBank() != null ? td.getRenewalPsrBank() : td.getPsrBank())
                        .maturityInstruction(td.getMaturityInstruction().name())
                        .autoRenew(td.isAutoRenew())
                        .earlyWithdrawalAllowed(td.isEarlyWithdrawalAllowed())
                        .lossDisclosureAccepted(true)
                        .build();
                // Only mark as ROLLED_OVER after successful rollover creation
                try {
                    createTermDeposit(rolloverRequest);
                    log.info("Rollover TD created for original {}", td.getDepositRef());
                    td.setStatus(MudarabahTDStatus.ROLLED_OVER);
                    td.setRolloverCount(td.getRolloverCount() + 1);
                    log.info("TD {} rolled over (principal only)", td.getDepositRef());
                } catch (Exception e) {
                    log.error("Failed to create rollover TD for {}, marking as MATURED: {}", td.getDepositRef(), e.getMessage());
                    td.setStatus(MudarabahTDStatus.MATURED);
                }
            }
            case ROLLOVER_PRINCIPAL_AND_PROFIT -> {
                // Create new TD for rollover with principal + profit BEFORE marking original as rolled over
                CreateMudarabahTermDepositRequest rolloverPPRequest = CreateMudarabahTermDepositRequest.builder()
                        .customerId(td.getMudarabahAccount().getAccount().getCustomer() != null
                                ? td.getMudarabahAccount().getAccount().getCustomer().getId() : null)
                        .productCode(td.getMudarabahAccount().getContractTypeCode())
                        .currencyCode(td.getCurrencyCode())
                        .principalAmount(totalAmount) // principal + profit
                        .tenorDays(td.getRenewalTenorDays() != null ? td.getRenewalTenorDays() : td.getTenorDays())
                        .fundingAccountId(tdAccount.getId())
                        .mudarabahType(td.getMudarabahAccount().getMudarabahType())
                        .profitSharingRatioCustomer(td.getRenewalPsrCustomer() != null ? td.getRenewalPsrCustomer() : td.getPsrCustomer())
                        .profitSharingRatioBank(td.getRenewalPsrBank() != null ? td.getRenewalPsrBank() : td.getPsrBank())
                        .maturityInstruction(td.getMaturityInstruction().name())
                        .autoRenew(td.isAutoRenew())
                        .earlyWithdrawalAllowed(td.isEarlyWithdrawalAllowed())
                        .lossDisclosureAccepted(true)
                        .build();
                // Only mark as ROLLED_OVER after successful rollover creation
                try {
                    createTermDeposit(rolloverPPRequest);
                    log.info("Rollover TD (principal + profit) created for original {}", td.getDepositRef());
                    td.setStatus(MudarabahTDStatus.ROLLED_OVER);
                    td.setRolloverCount(td.getRolloverCount() + 1);
                    log.info("TD {} rolled over (principal + profit)", td.getDepositRef());
                } catch (Exception e) {
                    log.error("Failed to create rollover TD (P+P) for {}, marking as MATURED: {}", td.getDepositRef(), e.getMessage());
                    td.setStatus(MudarabahTDStatus.MATURED);
                }
            }
            case PAY_TO_ACCOUNT, PAY_TO_WADIAH -> {
                if (td.getPayoutAccountId() != null) {
                    Account payoutAccount = accountRepository.findById(td.getPayoutAccountId())
                            .orElseThrow(() -> new ResourceNotFoundException("Payout account not found"));
                    accountPostingService.postTransfer(tdAccount, payoutAccount,
                            totalAmount, totalAmount,
                            "Mudarabah TD maturity payout " + td.getDepositRef(),
                            "Mudarabah TD maturity received " + td.getDepositRef(),
                            TransactionChannel.SYSTEM, td.getDepositRef() + ":MAT",
                            "MUDARABAH", td.getDepositRef());
                }
                td.setStatus(MudarabahTDStatus.MATURED);
            }
            case HOLD_PENDING_INSTRUCTION -> {
                td.setStatus(MudarabahTDStatus.MATURED);
                log.info("TD {} matured - holding pending instruction", td.getDepositRef());
            }
        }

        // Post bank's share of profit at maturity to GL
        BigDecimal bankProfitShare = BigDecimal.ZERO;
        try {
            List<PoolProfitAllocation> bankAllocations = allocationRepository
                    .findByAccountIdAndPeriodFromGreaterThanEqualAndPeriodToLessThanEqual(
                            tdAccount.getId(), td.getStartDate(), LocalDate.now());
            bankProfitShare = bankAllocations.stream()
                    .filter(a -> a.getDistributionStatus() == ProfitAllocationStatus.DISTRIBUTED)
                    .map(PoolProfitAllocation::getBankProfitShare)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } catch (Exception e) {
            log.warn("Could not load bank profit allocations for TD {}: {}", td.getDepositRef(), e.getMessage());
        }
        if (bankProfitShare.compareTo(BigDecimal.ZERO) > 0) {
            accountPostingService.postDebitAgainstGl(tdAccount, TransactionType.DEBIT,
                    bankProfitShare,
                    "Bank Mudarib share at TD maturity " + td.getDepositRef(),
                    TransactionChannel.SYSTEM, td.getDepositRef() + ":BANK-PROFIT",
                    BANK_MUDARIB_INCOME_GL, "MUDARABAH", td.getDepositRef());
            log.info("Bank profit share posted for TD {}: {}", td.getDepositRef(), bankProfitShare);
        }

        termDepositRepository.save(td);
        log.info("TD maturity processed: ref={}, status={}", td.getDepositRef(), td.getStatus());
        log.info("AUDIT: Term deposit matured - ref={}, instruction={}, profit={}, bankProfit={}, actor={}",
                td.getDepositRef(), instruction, profit, bankProfitShare, "SYSTEM");
        return toResponse(td);
    }

    public void processMaturityBatch() {
        List<MudarabahTermDeposit> maturing = termDepositRepository
                .findByStatusAndMaturityDateLessThanEqual(MudarabahTDStatus.ACTIVE, LocalDate.now());
        log.info("Processing {} maturing term deposits", maturing.size());
        for (MudarabahTermDeposit td : maturing) {
            try {
                processMaturity(td.getId());
            } catch (Exception e) {
                log.error("Failed to process maturity for TD {}: {}", td.getDepositRef(), e.getMessage());
            }
        }
    }

    public MudarabahTermDepositResponse processEarlyWithdrawal(Long termDepositId, String reason) {
        MudarabahTermDeposit td = termDepositRepository.findById(termDepositId)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found"));

        if (td.getStatus() != MudarabahTDStatus.ACTIVE) {
            throw new BusinessException("Term deposit is not active", "TD_NOT_ACTIVE");
        }
        if (!td.isEarlyWithdrawalAllowed()) {
            throw new BusinessException("Early withdrawal not allowed for this term deposit", "EARLY_WITHDRAWAL_NOT_ALLOWED");
        }
        if (td.isHasLien()) {
            throw new BusinessException("Cannot withdraw - active lien on this term deposit", "LIEN_ACTIVE");
        }

        Account tdAccount = td.getMudarabahAccount().getAccount();
        BigDecimal principal = td.getPrincipalAmount();
        BigDecimal payoutAmount;

        EarlyWithdrawalPenalty penaltyType = td.getEarlyWithdrawalPenaltyType();
        if (penaltyType == EarlyWithdrawalPenalty.FORFEIT_PROFIT) {
            payoutAmount = principal; // Customer gets principal only
            log.info("Early withdrawal with profit forfeiture for TD {}", td.getDepositRef());
        } else if (penaltyType == EarlyWithdrawalPenalty.REDUCED_PSR && td.getEarlyWithdrawalReducedPsr() != null) {
            // Recalculate profit at reduced PSR
            BigDecimal profit = td.getAccumulatedProfit() != null ? td.getAccumulatedProfit() : BigDecimal.ZERO;
            BigDecimal reducedProfit = profit.multiply(td.getEarlyWithdrawalReducedPsr())
                    .divide(td.getPsrCustomer(), 4, RoundingMode.HALF_UP);
            payoutAmount = principal.add(reducedProfit);
        } else if (penaltyType == EarlyWithdrawalPenalty.FLAT_FEE) {
            // Deduct a flat fee from principal + profit
            BigDecimal profit = td.getAccumulatedProfit() != null ? td.getAccumulatedProfit() : BigDecimal.ZERO;
            BigDecimal totalBeforeFee = principal.add(profit);
            // Flat fee is stored in earlyWithdrawalReducedPsr field (reused as fee amount) or use a fixed deduction
            BigDecimal flatFee = td.getEarlyWithdrawalReducedPsr() != null ? td.getEarlyWithdrawalReducedPsr() : BigDecimal.ZERO;
            payoutAmount = totalBeforeFee.subtract(flatFee);
            if (payoutAmount.compareTo(BigDecimal.ZERO) < 0) {
                payoutAmount = BigDecimal.ZERO;
            }
            log.info("Early withdrawal with flat fee {} for TD {}", flatFee, td.getDepositRef());
        } else {
            // NONE or default - full profit
            payoutAmount = principal.add(td.getAccumulatedProfit() != null ? td.getAccumulatedProfit() : BigDecimal.ZERO);
        }

        // Transfer to payout account
        if (td.getPayoutAccountId() != null && payoutAmount.compareTo(BigDecimal.ZERO) > 0) {
            Account payoutAccount = accountRepository.findById(td.getPayoutAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException("Payout account not found"));
            accountPostingService.postTransfer(tdAccount, payoutAccount,
                    payoutAmount, payoutAmount,
                    "Mudarabah TD early withdrawal " + td.getDepositRef(),
                    "Mudarabah TD early withdrawal " + td.getDepositRef(),
                    TransactionChannel.SYSTEM, td.getDepositRef() + ":EW",
                    "MUDARABAH", td.getDepositRef());
        }

        td.setStatus(MudarabahTDStatus.EARLY_WITHDRAWN);
        td.setEarlyWithdrawnAt(LocalDate.now());
        td.setEarlyWithdrawalReason(reason);
        td.setPoolExitDate(LocalDate.now());
        termDepositRepository.save(td);

        log.info("Early withdrawal processed: ref={}, amount={}", td.getDepositRef(), payoutAmount);
        return toResponse(td);
    }

    public void placeLien(Long termDepositId, String financingReference, BigDecimal lienAmount) {
        MudarabahTermDeposit td = termDepositRepository.findById(termDepositId)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found"));
        if (td.getStatus() != MudarabahTDStatus.ACTIVE) {
            throw new BusinessException("Can only place lien on active term deposits", "TD_NOT_ACTIVE");
        }
        // Validate lien amount does not exceed principal
        if (lienAmount.compareTo(td.getPrincipalAmount()) > 0) {
            throw new BusinessException("Lien amount " + lienAmount
                    + " exceeds principal amount " + td.getPrincipalAmount(), "LIEN_EXCEEDS_PRINCIPAL");
        }
        td.setHasLien(true);
        td.setLienReference(financingReference);
        td.setLienAmount(lienAmount);
        termDepositRepository.save(td);
        // Also place lien on the underlying account
        Account account = td.getMudarabahAccount().getAccount();
        account.placeLien(lienAmount);
        accountRepository.save(account);
        log.info("Lien placed on TD {}: ref={}, amount={}", td.getDepositRef(), financingReference, lienAmount);
    }

    public void releaseLien(Long termDepositId, String reason) {
        MudarabahTermDeposit td = termDepositRepository.findById(termDepositId)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found"));
        BigDecimal lienAmount = td.getLienAmount() != null ? td.getLienAmount() : BigDecimal.ZERO;
        td.setHasLien(false);
        td.setLienReference(null);
        td.setLienAmount(null);
        termDepositRepository.save(td);
        Account account = td.getMudarabahAccount().getAccount();
        account.releaseLien(lienAmount);
        accountRepository.save(account);
        log.info("Lien released on TD {}: reason={}", td.getDepositRef(), reason);
    }

    @Transactional(readOnly = true)
    public MudarabahTermDepositResponse getTermDeposit(Long termDepositId) {
        return toResponse(termDepositRepository.findById(termDepositId)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found")));
    }

    @Transactional(readOnly = true)
    public MudarabahTermDepositResponse getByDepositRef(String depositRef) {
        return toResponse(termDepositRepository.findByDepositRef(depositRef)
                .orElseThrow(() -> new ResourceNotFoundException("Term deposit not found: " + depositRef)));
    }

    @Transactional(readOnly = true)
    public List<MudarabahTermDepositResponse> getCustomerTermDeposits(Long customerId) {
        return termDepositRepository.findByCustomerId(customerId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MudarabahTermDepositResponse> getMaturingDeposits(LocalDate from, LocalDate to) {
        return termDepositRepository.findByMaturityDateBetween(from, to).stream()
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Page<MudarabahTermDepositResponse> searchTermDeposits(MudarabahTDSearchCriteria criteria, Pageable pageable) {
        Specification<MudarabahTermDeposit> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (criteria.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), MudarabahTDStatus.valueOf(criteria.getStatus())));
            }
            if (criteria.getInvestmentPoolId() != null) {
                predicates.add(cb.equal(root.get("investmentPoolId"), criteria.getInvestmentPoolId()));
            }
            if (criteria.getMaturityDateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("maturityDate"), criteria.getMaturityDateFrom()));
            }
            if (criteria.getMaturityDateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("maturityDate"), criteria.getMaturityDateTo()));
            }
            if (criteria.getMinAmount() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("principalAmount"), criteria.getMinAmount()));
            }
            if (criteria.getMaxAmount() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("principalAmount"), criteria.getMaxAmount()));
            }
            if (criteria.getMinTenorDays() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("tenorDays"), criteria.getMinTenorDays()));
            }
            if (criteria.getMaxTenorDays() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("tenorDays"), criteria.getMaxTenorDays()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return termDepositRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public MudarabahTDPortfolioSummary getTDPortfolioSummary() {
        long total = termDepositRepository.countByStatus(MudarabahTDStatus.ACTIVE);
        BigDecimal totalPrincipal = termDepositRepository.sumActivePrincipal();
        long upcoming30 = termDepositRepository.findByMaturityDateBetween(LocalDate.now(), LocalDate.now().plusDays(30)).size();
        long upcoming90 = termDepositRepository.findByMaturityDateBetween(LocalDate.now(), LocalDate.now().plusDays(90)).size();

        return MudarabahTDPortfolioSummary.builder()
                .totalTermDeposits(total)
                .totalPrincipal(totalPrincipal)
                .upcomingMaturities30Days(upcoming30)
                .upcomingMaturities90Days(upcoming90)
                .build();
    }

    private BigDecimal calculateEstimatedMaturity(BigDecimal principalAmount, int tenorDays) {
        return calculateEstimatedMaturity(principalAmount, tenorDays, null);
    }

    private BigDecimal calculateEstimatedMaturity(BigDecimal principalAmount, int tenorDays, Long poolId) {
        // Try to use the pool's actual indicative rate instead of a hardcoded value
        BigDecimal indicativeRate = new BigDecimal("0.05"); // fallback 5% indicative annual rate
        if (poolId != null) {
            try {
                var poolOpt = investmentPoolRepository.findById(poolId);
                if (poolOpt.isPresent() && poolOpt.get().getIndicativeRate() != null) {
                    indicativeRate = poolOpt.get().getIndicativeRate()
                            .divide(new BigDecimal("100"), 6, RoundingMode.HALF_UP);
                }
            } catch (Exception e) {
                log.warn("Could not retrieve pool indicative rate for pool {}, using default", poolId);
            }
        }
        BigDecimal estimatedProfit = principalAmount
                .multiply(indicativeRate)
                .multiply(BigDecimal.valueOf(tenorDays))
                .divide(BigDecimal.valueOf(365), 4, RoundingMode.HALF_UP);
        return principalAmount.add(estimatedProfit);
    }

    private void validatePsr(BigDecimal customer, BigDecimal bank) {
        if (customer.compareTo(BigDecimal.ZERO) <= 0 || customer.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Customer PSR must be between 0 and 100", "INVALID_PSR_RANGE");
        }
        if (bank.compareTo(BigDecimal.ZERO) <= 0 || bank.compareTo(new BigDecimal("100")) > 0) {
            throw new BusinessException("Bank PSR must be between 0 and 100", "INVALID_PSR_RANGE");
        }
        if (customer.add(bank).compareTo(new BigDecimal("100.0000")) != 0) {
            throw new BusinessException("PSR customer + bank must equal 100. Got: " + customer.add(bank), "PSR_SUM_INVALID");
        }
    }

    private MudarabahTermDepositResponse toResponse(MudarabahTermDeposit td) {
        MudarabahAccount ma = td.getMudarabahAccount();
        Account account = ma.getAccount();
        return MudarabahTermDepositResponse.builder()
                .id(td.getId())
                .mudarabahAccountId(ma.getId())
                .depositRef(td.getDepositRef())
                .principalAmount(td.getPrincipalAmount())
                .currencyCode(td.getCurrencyCode())
                .tenorDays(td.getTenorDays())
                .tenorMonths(td.getTenorMonths() != null ? td.getTenorMonths() : td.getTenorDays() / 30)
                .startDate(td.getStartDate())
                .maturityDate(td.getMaturityDate())
                .maturityDateHijri(td.getMaturityDateHijri())
                .psrCustomer(td.getPsrCustomer())
                .psrBank(td.getPsrBank())
                .profitDistributionFrequency(td.getProfitDistributionFrequency() != null ? td.getProfitDistributionFrequency().name() : null)
                .lastProfitDistributionDate(td.getLastProfitDistributionDate())
                .accumulatedProfit(td.getAccumulatedProfit())
                .estimatedMaturityAmount(td.getEstimatedMaturityAmount())
                .actualMaturityAmount(td.getActualMaturityAmount())
                .investmentPoolId(td.getInvestmentPoolId())
                .poolEntryDate(td.getPoolEntryDate())
                .poolExitDate(td.getPoolExitDate())
                .maturityInstruction(td.getMaturityInstruction() != null ? td.getMaturityInstruction().name() : null)
                .payoutAccountId(td.getPayoutAccountId())
                .autoRenew(td.isAutoRenew())
                .rolloverCount(td.getRolloverCount())
                .originalDepositRef(td.getOriginalDepositRef())
                .earlyWithdrawalAllowed(td.isEarlyWithdrawalAllowed())
                .earlyWithdrawalPenaltyType(td.getEarlyWithdrawalPenaltyType() != null ? td.getEarlyWithdrawalPenaltyType().name() : null)
                .earlyWithdrawalReducedPsr(td.getEarlyWithdrawalReducedPsr())
                .earlyWithdrawalReason(td.getEarlyWithdrawalReason())
                .earlyWithdrawnAt(td.getEarlyWithdrawnAt())
                .renewalPsrCustomer(td.getRenewalPsrCustomer())
                .renewalPsrBank(td.getRenewalPsrBank())
                .renewalTenorDays(td.getRenewalTenorDays())
                .status(td.getStatus().name())
                .maturedAt(td.getMaturedAt())
                .hasLien(td.isHasLien())
                .lienReference(td.getLienReference())
                .lienAmount(td.getLienAmount())
                .contractReference(ma.getContractReference())
                .accountNumber(account.getAccountNumber())
                .bookBalance(account.getBookBalance())
                .build();
    }
}
