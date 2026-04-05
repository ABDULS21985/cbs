package com.cbs.leasing.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.gl.entity.JournalEntry;
import com.cbs.gl.service.GeneralLedgerService;
import com.cbs.leasing.entity.LeaseContract;
import com.cbs.leasing.repository.LeaseContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LeasingService {

    private static final String GL_ROU_ASSET = "1600010";
    private static final String GL_LEASE_LIABILITY = "2200010";
    private static final String GL_CUSTOMER_ACCOUNT = "1100010";
    private static final String GL_DEPRECIATION_EXPENSE = "5400010";
    private static final String GL_ACCUMULATED_DEPRECIATION = "1600020";
    private static final String GL_EARLY_TERMINATION_INCOME = "4200010";

    private final LeaseContractRepository leaseRepository;
    private final GeneralLedgerService generalLedgerService;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public LeaseContract createLease(LeaseContract lease) {
        lease.setLeaseNumber("LSE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());

        // IFRS 16: Calculate Right-of-Use asset and lease liability
        if ("RIGHT_OF_USE".equals(lease.getIfrs16Classification())) {
            if (lease.getPeriodicPayment() == null || lease.getPeriodicPayment().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Periodic payment is required for ROU leases", "MISSING_PERIODIC_PAYMENT");
            }
            if (lease.getImplicitRate() == null || lease.getImplicitRate().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Implicit rate is required for ROU leases", "MISSING_IMPLICIT_RATE");
            }
            if (lease.getTermMonths() == null || lease.getTermMonths() <= 0) {
                throw new BusinessException("Term months is required for ROU leases", "MISSING_TERM_MONTHS");
            }
            BigDecimal liability = calculatePresentValue(
                    lease.getPeriodicPayment(), lease.getImplicitRate(), lease.getTermMonths(), lease.getPaymentFrequency());
            lease.setLeaseLiability(liability);
            // ROU asset = liability + advance payments + initial direct costs - incentives
            BigDecimal securityDeposit = lease.getSecurityDeposit() != null ? lease.getSecurityDeposit() : BigDecimal.ZERO;
            BigDecimal rouAsset = liability.add(securityDeposit);
            lease.setRouAssetAmount(rouAsset);
        }

        lease.setCurrentBalance(lease.getPrincipalAmount());
        lease.setStatus("DRAFT");
        LeaseContract saved = leaseRepository.save(lease);
        log.info("Lease created: number={}, type={}, asset={}, amount={}, term={}m, IFRS16={}",
                saved.getLeaseNumber(), saved.getLeaseType(), saved.getAssetCategory(),
                saved.getPrincipalAmount(), saved.getTermMonths(), saved.getIfrs16Classification());
        return saved;
    }

    @Transactional
    public LeaseContract activate(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"DRAFT".equals(lease.getStatus()) && !"APPROVED".equals(lease.getStatus()))
            throw new BusinessException("Only DRAFT/APPROVED leases can be activated");
        lease.setStatus("ACTIVE");
        lease.setCommencementDate(LocalDate.now());
        lease.setMaturityDate(LocalDate.now().plusMonths(lease.getTermMonths()));
        lease.setUpdatedAt(Instant.now());
        log.info("Lease activated: number={}, maturity={}", leaseNumber, lease.getMaturityDate());
        return leaseRepository.save(lease);
    }

    @Transactional
    public LeaseContract recordDepreciation(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"ACTIVE".equals(lease.getStatus())) throw new BusinessException("Lease not active", "LEASE_NOT_ACTIVE");
        if (lease.getRouAssetAmount() == null) throw new BusinessException("No ROU asset to depreciate", "NO_ROU_ASSET");

        // Idempotency guard: check if depreciation already recorded for current month
        YearMonth currentMonth = YearMonth.now();
        if (lease.getLastDepreciationMonth() != null
                && lease.getLastDepreciationMonth().equals(currentMonth.toString())) {
            log.warn("Depreciation already recorded for lease {} in month {}", leaseNumber, currentMonth);
            return lease;
        }

        BigDecimal accumulatedDep = lease.getAccumulatedDepreciation() != null
                ? lease.getAccumulatedDepreciation() : BigDecimal.ZERO;

        BigDecimal monthlyDepreciation;
        if ("STRAIGHT_LINE".equals(lease.getDepreciationMethod())) {
            BigDecimal depreciableAmount = lease.getRouAssetAmount().subtract(
                    lease.getResidualValue() != null ? lease.getResidualValue() : BigDecimal.ZERO);
            Integer termMonths = lease.getTermMonths() != null && lease.getTermMonths() > 0
                    ? lease.getTermMonths() : 12;
            monthlyDepreciation = depreciableAmount.divide(BigDecimal.valueOf(termMonths), 4, RoundingMode.HALF_UP);
        } else {
            // Declining balance: 2/useful_life * (ROU - accumulated)
            Integer termMonths = lease.getTermMonths() != null && lease.getTermMonths() > 0
                    ? lease.getTermMonths() : 12;
            BigDecimal rate = new BigDecimal("2").divide(BigDecimal.valueOf(termMonths), 6, RoundingMode.HALF_UP);
            monthlyDepreciation = lease.getRouAssetAmount().subtract(accumulatedDep).multiply(rate);
        }

        // Cap depreciation so accumulated does not exceed depreciable amount
        BigDecimal maxDepreciable = lease.getRouAssetAmount().subtract(
                lease.getResidualValue() != null ? lease.getResidualValue() : BigDecimal.ZERO);
        if (accumulatedDep.add(monthlyDepreciation).compareTo(maxDepreciable) > 0) {
            monthlyDepreciation = maxDepreciable.subtract(accumulatedDep);
        }
        if (monthlyDepreciation.compareTo(BigDecimal.ZERO) <= 0) {
            log.info("Lease {} fully depreciated, skipping", leaseNumber);
            return lease;
        }

        lease.setAccumulatedDepreciation(accumulatedDep.add(monthlyDepreciation));
        lease.setLastDepreciationMonth(currentMonth.toString());
        lease.setUpdatedAt(Instant.now());

        // GL posting: Debit Depreciation Expense, Credit Accumulated Depreciation
        String narration = String.format("Lease depreciation - %s period %s", leaseNumber, currentMonth);
        List<GeneralLedgerService.JournalLineRequest> journalLines = List.of(
                new GeneralLedgerService.JournalLineRequest(
                        GL_DEPRECIATION_EXPENSE,
                        monthlyDepreciation, BigDecimal.ZERO,
                        lease.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, lease.getCustomerId()),
                new GeneralLedgerService.JournalLineRequest(
                        GL_ACCUMULATED_DEPRECIATION,
                        BigDecimal.ZERO, monthlyDepreciation,
                        lease.getCurrency(), BigDecimal.ONE,
                        narration, null, null, null, lease.getCustomerId())
        );

        JournalEntry journal = generalLedgerService.postJournal(
                "LEASE", narration, "LEASING", leaseNumber + "-DEP-" + currentMonth,
                LocalDate.now(), currentActorProvider.getCurrentActor(), journalLines);

        log.info("Lease depreciation recorded: number={}, monthly={}, accumulated={}, journalId={}, actor={}",
                leaseNumber, monthlyDepreciation, lease.getAccumulatedDepreciation(),
                journal.getId(), currentActorProvider.getCurrentActor());
        return leaseRepository.save(lease);
    }

    @Transactional
    public LeaseContract exercisePurchaseOption(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"ACTIVE".equals(lease.getStatus())) {
            throw new BusinessException("Only ACTIVE leases can exercise purchase option", "LEASE_NOT_ACTIVE");
        }
        if (lease.getPurchaseOptionPrice() == null) {
            throw new BusinessException("No purchase option on this lease", "NO_PURCHASE_OPTION");
        }

        BigDecimal purchasePrice = lease.getPurchaseOptionPrice();
        BigDecimal remainingLiability = lease.getLeaseLiability() != null ? lease.getLeaseLiability() : BigDecimal.ZERO;

        // GL posting: Debit Customer Account (purchase price), Credit ROU Asset GL
        // Also remove lease liability: Debit Lease Liability, Credit Customer Account
        String narration = String.format("Lease purchase option exercised - %s price %s", leaseNumber, purchasePrice);
        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();

        // Leg 1: Debit Customer Account for purchase price
        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                GL_CUSTOMER_ACCOUNT,
                purchasePrice, BigDecimal.ZERO,
                lease.getCurrency(), BigDecimal.ONE,
                narration, null, null, lease.getAccountId(), lease.getCustomerId()));

        // Leg 2: Credit ROU Asset GL for purchase price
        journalLines.add(new GeneralLedgerService.JournalLineRequest(
                GL_ROU_ASSET,
                BigDecimal.ZERO, purchasePrice,
                lease.getCurrency(), BigDecimal.ONE,
                narration, null, null, null, lease.getCustomerId()));

        // Leg 3 & 4: Remove remaining lease liability if any
        if (remainingLiability.compareTo(BigDecimal.ZERO) > 0) {
            String liabilityNarration = String.format("Lease liability removal on buyout - %s", leaseNumber);
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_LEASE_LIABILITY,
                    remainingLiability, BigDecimal.ZERO,
                    lease.getCurrency(), BigDecimal.ONE,
                    liabilityNarration, null, null, null, lease.getCustomerId()));
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_ROU_ASSET,
                    BigDecimal.ZERO, remainingLiability,
                    lease.getCurrency(), BigDecimal.ONE,
                    liabilityNarration, null, null, null, lease.getCustomerId()));
        }

        JournalEntry journal = generalLedgerService.postJournal(
                "LEASE", narration, "LEASING", leaseNumber + "-BUYOUT",
                LocalDate.now(), currentActorProvider.getCurrentActor(), journalLines);

        lease.setStatus("BUYOUT_EXERCISED");
        lease.setCurrentBalance(BigDecimal.ZERO);
        lease.setLeaseLiability(BigDecimal.ZERO);
        lease.setUpdatedAt(Instant.now());

        LeaseContract saved = leaseRepository.save(lease);
        log.info("Lease purchase option exercised: number={}, price={}, liabilityRemoved={}, journalId={}, actor={}",
                leaseNumber, purchasePrice, remainingLiability, journal.getId(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public LeaseContract earlyTerminate(String leaseNumber) {
        LeaseContract lease = getByNumber(leaseNumber);
        if (!"ACTIVE".equals(lease.getStatus())) {
            throw new BusinessException("Lease not active", "LEASE_NOT_ACTIVE");
        }

        // Calculate early termination fee based on remaining balance
        BigDecimal terminationFeeAmount = BigDecimal.ZERO;
        if (lease.getEarlyTerminationFee() != null && lease.getEarlyTerminationFee().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal remainingBalance = lease.getCurrentBalance() != null ? lease.getCurrentBalance() : BigDecimal.ZERO;
            terminationFeeAmount = remainingBalance
                    .multiply(lease.getEarlyTerminationFee())
                    .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        }

        // GL posting for early termination
        String narration = String.format("Lease early termination - %s", leaseNumber);
        List<GeneralLedgerService.JournalLineRequest> journalLines = new ArrayList<>();

        // Remove remaining lease liability
        BigDecimal remainingLiability = lease.getLeaseLiability() != null ? lease.getLeaseLiability() : BigDecimal.ZERO;
        BigDecimal rouNetBook = BigDecimal.ZERO;
        if (lease.getRouAssetAmount() != null) {
            BigDecimal accDep = lease.getAccumulatedDepreciation() != null ? lease.getAccumulatedDepreciation() : BigDecimal.ZERO;
            rouNetBook = lease.getRouAssetAmount().subtract(accDep);
        }

        if (remainingLiability.compareTo(BigDecimal.ZERO) > 0) {
            // Debit Lease Liability to remove it
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_LEASE_LIABILITY,
                    remainingLiability, BigDecimal.ZERO,
                    lease.getCurrency(), BigDecimal.ONE,
                    narration, null, null, null, lease.getCustomerId()));
            // Credit ROU Asset to remove net book value
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_ROU_ASSET,
                    BigDecimal.ZERO, remainingLiability,
                    lease.getCurrency(), BigDecimal.ONE,
                    narration, null, null, null, lease.getCustomerId()));
        }

        // Post early termination fee if applicable
        if (terminationFeeAmount.compareTo(BigDecimal.ZERO) > 0) {
            String feeNarration = String.format("Early termination fee - %s (%s%%)",
                    leaseNumber, lease.getEarlyTerminationFee());
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_CUSTOMER_ACCOUNT,
                    terminationFeeAmount, BigDecimal.ZERO,
                    lease.getCurrency(), BigDecimal.ONE,
                    feeNarration, null, null, lease.getAccountId(), lease.getCustomerId()));
            journalLines.add(new GeneralLedgerService.JournalLineRequest(
                    GL_EARLY_TERMINATION_INCOME,
                    BigDecimal.ZERO, terminationFeeAmount,
                    lease.getCurrency(), BigDecimal.ONE,
                    feeNarration, null, null, null, lease.getCustomerId()));
        }

        JournalEntry journal = null;
        if (!journalLines.isEmpty()) {
            journal = generalLedgerService.postJournal(
                    "LEASE", narration, "LEASING", leaseNumber + "-EARLY-TERM",
                    LocalDate.now(), currentActorProvider.getCurrentActor(), journalLines);
        }

        lease.setStatus("EARLY_TERMINATED");
        lease.setLeaseLiability(BigDecimal.ZERO);
        lease.setCurrentBalance(BigDecimal.ZERO);
        lease.setUpdatedAt(Instant.now());

        LeaseContract saved = leaseRepository.save(lease);
        log.info("Lease early terminated: number={}, fee={}% (amount={}), journalId={}, actor={}",
                leaseNumber, lease.getEarlyTerminationFee(), terminationFeeAmount,
                journal != null ? journal.getId() : "N/A",
                currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<LeaseContract> getByCustomer(Long customerId) { return leaseRepository.findByCustomerIdOrderByCreatedAtDesc(customerId); }
    public List<LeaseContract> getByAssetCategory(String category) { return leaseRepository.findByAssetCategoryAndStatusOrderByCreatedAtDesc(category, "ACTIVE"); }

    private LeaseContract getByNumber(String number) {
        return leaseRepository.findByLeaseNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("LeaseContract", "leaseNumber", number));
    }

    private BigDecimal calculatePresentValue(BigDecimal payment, BigDecimal annualRate, int months, String frequency) {
        int periodsPerYear = switch (frequency) { case "QUARTERLY" -> 4; case "SEMI_ANNUAL" -> 2; case "ANNUAL" -> 1; default -> 12; };
        int totalPeriods = months * periodsPerYear / 12;
        double r = annualRate.doubleValue() / (periodsPerYear * 100.0);
        double pv = payment.doubleValue() * (1 - Math.pow(1 + r, -totalPeriods)) / r;
        return BigDecimal.valueOf(pv).setScale(4, RoundingMode.HALF_UP);
    }

    public java.util.List<LeaseContract> getAllLeases() {
        return leaseRepository.findAll();
    }

}
