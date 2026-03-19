package com.cbs.virtualaccount.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.virtualaccount.entity.*;
import com.cbs.virtualaccount.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class VirtualAccountService {

    private final VirtualAccountRepository vaRepository;
    private final VaTransactionRepository txnRepository;
    private final VaMatchingRuleRepository ruleRepository;
    private final VaSweepHistoryRepository sweepHistoryRepository;

    // ── Core VA operations ──────────────────────────────────────────────────

    public List<VirtualAccount> getAllAccounts() {
        return vaRepository.findAll();
    }

    public VirtualAccount getById(Long id) {
        return vaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("VirtualAccount", "id", id));
    }

    @Transactional
    public VirtualAccount create(VirtualAccount va) {
        va.setVirtualAccountNumber("VA-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        VirtualAccount saved = vaRepository.save(va);
        log.info("Virtual account created: number={}, master={}, purpose={}", saved.getVirtualAccountNumber(),
                saved.getMasterAccountId(), saved.getAccountPurpose());
        return saved;
    }

    @Transactional
    public VirtualAccount credit(String vaNumber, BigDecimal amount, String reference) {
        VirtualAccount va = getByNumber(vaNumber);
        BigDecimal balanceBefore = va.getVirtualBalance();
        va.setVirtualBalance(va.getVirtualBalance().add(amount));
        va.setUpdatedAt(Instant.now());

        // Record transaction
        txnRepository.save(VaTransaction.builder()
                .vaId(va.getId())
                .reference(reference != null ? reference : "CREDIT-" + UUID.randomUUID().toString().substring(0, 8))
                .description("Credit to virtual account")
                .amount(amount)
                .transactionType("CREDIT")
                .matchStatus("UNMATCHED")
                .build());

        log.info("VA credit: number={}, amount={}, newBalance={}, ref={}", vaNumber, amount, va.getVirtualBalance(), reference);

        // Auto-sweep check
        if (va.getAutoSweepEnabled() && va.getSweepThreshold() != null
                && va.getVirtualBalance().compareTo(va.getSweepThreshold()) > 0
                && "TO_MASTER".equals(va.getSweepDirection())) {
            BigDecimal target = va.getSweepTargetBalance() != null ? va.getSweepTargetBalance() : BigDecimal.ZERO;
            BigDecimal sweepAmount = va.getVirtualBalance().subtract(target);
            BigDecimal sweepBalanceBefore = va.getVirtualBalance();
            va.setVirtualBalance(target);

            // Record sweep history
            sweepHistoryRepository.save(VaSweepHistory.builder()
                    .vaId(va.getId())
                    .sweepAmount(sweepAmount)
                    .direction("TO_MASTER")
                    .balanceBefore(sweepBalanceBefore)
                    .balanceAfter(target)
                    .build());

            // Record sweep as transaction
            txnRepository.save(VaTransaction.builder()
                    .vaId(va.getId())
                    .reference("SWEEP-" + UUID.randomUUID().toString().substring(0, 8))
                    .description("Auto-sweep to master account")
                    .amount(sweepAmount)
                    .transactionType("SWEEP")
                    .matchStatus("MATCHED")
                    .build());

            log.info("VA auto-sweep TO_MASTER: number={}, swept={}", vaNumber, sweepAmount);
        }

        return vaRepository.save(va);
    }

    @Transactional
    public VirtualAccount debit(String vaNumber, BigDecimal amount) {
        VirtualAccount va = getByNumber(vaNumber);
        if (va.getVirtualBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient virtual balance: available=" + va.getVirtualBalance() + ", requested=" + amount);
        }
        va.setVirtualBalance(va.getVirtualBalance().subtract(amount));
        va.setUpdatedAt(Instant.now());

        // Record transaction
        txnRepository.save(VaTransaction.builder()
                .vaId(va.getId())
                .reference("DEBIT-" + UUID.randomUUID().toString().substring(0, 8))
                .description("Debit from virtual account")
                .amount(amount)
                .transactionType("DEBIT")
                .matchStatus("MATCHED")
                .build());

        return vaRepository.save(va);
    }

    /** Match incoming payment to virtual account by reference pattern */
    public Optional<VirtualAccount> matchPayment(String paymentReference) {
        List<VirtualAccount> all = vaRepository.findAll().stream()
                .filter(va -> va.getIsActive() && va.getReferencePattern() != null).toList();
        for (VirtualAccount va : all) {
            try {
                if (Pattern.matches(va.getReferencePattern(), paymentReference)) {
                    log.info("Payment matched to VA: ref={}, va={}", paymentReference, va.getVirtualAccountNumber());
                    return Optional.of(va);
                }
            } catch (Exception e) { /* skip invalid pattern */ }
        }
        return vaRepository.findByExternalReference(paymentReference);
    }

    @Transactional
    public int executeSweeps() {
        List<VirtualAccount> sweepable = vaRepository.findByAutoSweepEnabledTrueAndIsActiveTrue();
        int swept = 0;
        for (VirtualAccount va : sweepable) {
            if (va.getSweepThreshold() == null) continue;
            if ("TO_MASTER".equals(va.getSweepDirection()) && va.getVirtualBalance().compareTo(va.getSweepThreshold()) > 0) {
                BigDecimal target = va.getSweepTargetBalance() != null ? va.getSweepTargetBalance() : BigDecimal.ZERO;
                BigDecimal sweepAmount = va.getVirtualBalance().subtract(target);
                BigDecimal balanceBefore = va.getVirtualBalance();
                va.setVirtualBalance(target);
                va.setUpdatedAt(Instant.now());
                vaRepository.save(va);

                // Record sweep history
                sweepHistoryRepository.save(VaSweepHistory.builder()
                        .vaId(va.getId())
                        .sweepAmount(sweepAmount)
                        .direction("TO_MASTER")
                        .balanceBefore(balanceBefore)
                        .balanceAfter(target)
                        .build());

                // Record sweep transaction
                txnRepository.save(VaTransaction.builder()
                        .vaId(va.getId())
                        .reference("SWEEP-" + UUID.randomUUID().toString().substring(0, 8))
                        .description("Bulk sweep to master account")
                        .amount(sweepAmount)
                        .transactionType("SWEEP")
                        .matchStatus("MATCHED")
                        .build());

                swept++;
                log.info("Sweep executed: va={}, amount={}", va.getVirtualAccountNumber(), sweepAmount);
            }
        }
        if (swept > 0) log.info("Executed {} VA sweeps", swept);
        return swept;
    }

    @Transactional
    public VirtualAccount activate(String vaNumber) {
        VirtualAccount va = getByNumber(vaNumber);
        va.setIsActive(true);
        va.setUpdatedAt(Instant.now());
        return vaRepository.save(va);
    }

    @Transactional
    public VirtualAccount deactivate(String vaNumber) {
        VirtualAccount va = getByNumber(vaNumber);
        if (va.getVirtualBalance().signum() != 0) throw new BusinessException("Cannot deactivate VA with non-zero balance: " + va.getVirtualBalance());
        va.setIsActive(false);
        va.setUpdatedAt(Instant.now());
        return vaRepository.save(va);
    }

    /** Manual sweep — move balance back to physical account */
    @Transactional
    public VaSweepHistory manualSweep(String vaNumber) {
        VirtualAccount va = getByNumber(vaNumber);
        if (va.getVirtualBalance().signum() == 0) throw new BusinessException("Nothing to sweep — balance is zero");
        BigDecimal balanceBefore = va.getVirtualBalance();
        BigDecimal sweepAmount = va.getVirtualBalance();
        va.setVirtualBalance(BigDecimal.ZERO);
        va.setUpdatedAt(Instant.now());
        vaRepository.save(va);

        // Record sweep transaction
        txnRepository.save(VaTransaction.builder()
                .vaId(va.getId())
                .reference("MSWEEP-" + UUID.randomUUID().toString().substring(0, 8))
                .description("Manual sweep to master account")
                .amount(sweepAmount)
                .transactionType("SWEEP")
                .matchStatus("MATCHED")
                .build());

        VaSweepHistory history = sweepHistoryRepository.save(VaSweepHistory.builder()
                .vaId(va.getId())
                .sweepAmount(sweepAmount)
                .direction("TO_MASTER")
                .balanceBefore(balanceBefore)
                .balanceAfter(BigDecimal.ZERO)
                .build());

        log.info("Manual sweep: va={}, amount={}", va.getVirtualAccountNumber(), sweepAmount);
        return history;
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    public List<VirtualAccount> getByMaster(Long masterAccountId) { return vaRepository.findByMasterAccountIdAndIsActiveTrueOrderByAccountNameAsc(masterAccountId); }
    public List<VirtualAccount> getByCustomer(Long customerId) { return vaRepository.findByCustomerIdAndIsActiveTrueOrderByAccountNameAsc(customerId); }

    private VirtualAccount getByNumber(String number) {
        return vaRepository.findByVirtualAccountNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("VirtualAccount", "virtualAccountNumber", number));
    }

    // ── Transactions ────────────────────────────────────────────────────────

    public List<VaTransaction> getTransactions(Long vaId) {
        return txnRepository.findByVaIdOrderByTransactionDateDesc(vaId);
    }

    public List<VaTransaction> getUnmatchedTransactions(Long vaId) {
        return txnRepository.findByVaIdAndMatchStatusInOrderByTransactionDateDesc(vaId, List.of("UNMATCHED", "PARTIAL"));
    }

    @Transactional
    public VaTransaction manualMatch(Long transactionId, String matchedRef) {
        VaTransaction txn = txnRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("VaTransaction", "id", transactionId));
        txn.setMatchStatus("MATCHED");
        txn.setMatchedRef(matchedRef);
        return txnRepository.save(txn);
    }

    // ── Matching Rules ──────────────────────────────────────────────────────

    public List<VaMatchingRule> getMatchingRules(Long vaId) {
        return ruleRepository.findByVaIdOrderByPriorityAsc(vaId);
    }

    @Transactional
    public List<VaMatchingRule> saveMatchingRules(Long vaId, List<VaMatchingRule> rules) {
        ruleRepository.deleteByVaId(vaId);
        rules.forEach(r -> {
            r.setVaId(vaId);
            r.setUpdatedAt(Instant.now());
        });
        return ruleRepository.saveAll(rules);
    }

    // ── Sweep History ───────────────────────────────────────────────────────

    public List<VaSweepHistory> getSweepHistory(Long vaId) {
        return sweepHistoryRepository.findByVaIdOrderBySweptAtDesc(vaId);
    }
}
