package com.cbs.virtualaccount.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.virtualaccount.entity.VirtualAccount;
import com.cbs.virtualaccount.repository.VirtualAccountRepository;
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
        va.setVirtualBalance(va.getVirtualBalance().add(amount));
        va.setUpdatedAt(Instant.now());
        log.info("VA credit: number={}, amount={}, newBalance={}, ref={}", vaNumber, amount, va.getVirtualBalance(), reference);

        // Auto-sweep check
        if (va.getAutoSweepEnabled() && va.getSweepThreshold() != null
                && va.getVirtualBalance().compareTo(va.getSweepThreshold()) > 0
                && "TO_MASTER".equals(va.getSweepDirection())) {
            BigDecimal sweepAmount = va.getVirtualBalance().subtract(
                    va.getSweepTargetBalance() != null ? va.getSweepTargetBalance() : BigDecimal.ZERO);
            va.setVirtualBalance(va.getSweepTargetBalance() != null ? va.getSweepTargetBalance() : BigDecimal.ZERO);
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
        // Also check exact external reference
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
                va.setVirtualBalance(target);
                va.setUpdatedAt(Instant.now());
                vaRepository.save(va);
                swept++;
                log.info("Sweep executed: va={}, amount={}", va.getVirtualAccountNumber(), sweepAmount);
            }
        }
        if (swept > 0) log.info("Executed {} VA sweeps", swept);
        return swept;
    }

    public List<VirtualAccount> getByMaster(Long masterAccountId) { return vaRepository.findByMasterAccountIdAndIsActiveTrueOrderByAccountNameAsc(masterAccountId); }
    public List<VirtualAccount> getByCustomer(Long customerId) { return vaRepository.findByCustomerIdAndIsActiveTrueOrderByAccountNameAsc(customerId); }

    @Transactional
    public VirtualAccount deactivate(String vaNumber) {
        VirtualAccount va = getByNumber(vaNumber);
        if (va.getVirtualBalance().signum() != 0) throw new BusinessException("Cannot deactivate VA with non-zero balance: " + va.getVirtualBalance());
        va.setIsActive(false);
        va.setUpdatedAt(Instant.now());
        return vaRepository.save(va);
    }

    private VirtualAccount getByNumber(String number) {
        return vaRepository.findByVirtualAccountNumber(number)
                .orElseThrow(() -> new ResourceNotFoundException("VirtualAccount", "virtualAccountNumber", number));
    }

    public java.util.List<VirtualAccount> getAllAccounts() {
        return vaRepository.findAll();
    }

}
