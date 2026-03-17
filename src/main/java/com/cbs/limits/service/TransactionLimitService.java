package com.cbs.limits.service;

import com.cbs.account.entity.Account;
import com.cbs.common.exception.BusinessException;
import com.cbs.limits.entity.*;
import com.cbs.limits.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TransactionLimitService {

    private final TransactionLimitRepository limitRepository;
    private final TransactionLimitUsageRepository usageRepository;

    /**
     * Validates a transaction against all applicable limits.
     * Resolution order: CUSTOMER override > ACCOUNT > PRODUCT > GLOBAL
     * The most specific (narrowest scope) limit wins.
     */
    @Transactional
    public void validateAndRecordUsage(Account account, LimitType limitType, BigDecimal amount, String channel) {
        TransactionLimit applicableLimit = resolveLimit(limitType, account);

        if (applicableLimit == null) {
            return; // No limit configured — allow
        }

        // Check channel applicability
        if (!"ALL".equals(applicableLimit.getAppliesToChannels()) &&
                channel != null && !applicableLimit.getAppliesToChannels().contains(channel)) {
            return; // Limit doesn't apply to this channel
        }

        // Get or create today's usage
        TransactionLimitUsage usage = usageRepository
                .findByAccountIdAndLimitTypeAndUsageDate(account.getId(), limitType, LocalDate.now())
                .orElse(TransactionLimitUsage.builder()
                        .accountId(account.getId()).limitType(limitType)
                        .usageDate(LocalDate.now()).currencyCode(account.getCurrencyCode()).build());

        // Validate single transaction amount
        if (limitType == LimitType.SINGLE_TRANSACTION) {
            if (amount.compareTo(applicableLimit.getMaxAmount()) > 0) {
                throw new BusinessException(String.format("Transaction amount %s exceeds single transaction limit %s",
                        amount, applicableLimit.getMaxAmount()), "EXCEEDS_SINGLE_TXN_LIMIT");
            }
            return; // Single txn limit doesn't need usage tracking
        }

        // Validate cumulative amount
        BigDecimal projectedAmount = usage.getTotalAmount().add(amount);
        if (projectedAmount.compareTo(applicableLimit.getMaxAmount()) > 0) {
            throw new BusinessException(String.format("Cumulative amount %s would exceed %s limit of %s",
                    projectedAmount, limitType, applicableLimit.getMaxAmount()), "EXCEEDS_CUMULATIVE_LIMIT");
        }

        // Validate count
        if (applicableLimit.getMaxCount() != null && usage.getTotalCount() + 1 > applicableLimit.getMaxCount()) {
            throw new BusinessException(String.format("Transaction count would exceed %s limit of %d",
                    limitType, applicableLimit.getMaxCount()), "EXCEEDS_COUNT_LIMIT");
        }

        // Record usage
        usage.addUsage(amount);
        usageRepository.save(usage);
    }

    /**
     * Resolves the most specific limit for the given type and account.
     * Checks in order: CUSTOMER > ACCOUNT > PRODUCT > GLOBAL
     */
    private TransactionLimit resolveLimit(LimitType limitType, Account account) {
        LocalDate today = LocalDate.now();

        // 1. Customer-specific override
        List<TransactionLimit> customerLimits = limitRepository.findApplicableLimits(
                limitType, LimitScope.CUSTOMER, account.getCustomer().getId(), today);
        if (!customerLimits.isEmpty()) return customerLimits.get(0);

        // 2. Account-specific
        List<TransactionLimit> accountLimits = limitRepository.findApplicableLimits(
                limitType, LimitScope.ACCOUNT, account.getId(), today);
        if (!accountLimits.isEmpty()) return accountLimits.get(0);

        // 3. Product-level
        List<TransactionLimit> productLimits = limitRepository.findApplicableLimits(
                limitType, LimitScope.PRODUCT, account.getProduct().getId(), today);
        if (!productLimits.isEmpty()) return productLimits.get(0);

        // 4. Global
        List<TransactionLimit> globalLimits = limitRepository.findApplicableLimits(
                limitType, LimitScope.GLOBAL, null, today);
        return globalLimits.isEmpty() ? null : globalLimits.get(0);
    }

    // ========================================================================
    // LIMIT CRUD
    // ========================================================================

    @Transactional
    public TransactionLimit createLimit(TransactionLimit limit) {
        TransactionLimit saved = limitRepository.save(limit);
        log.info("Transaction limit created: type={}, scope={}, max={}", limit.getLimitType(), limit.getScope(), limit.getMaxAmount());
        return saved;
    }

    @Transactional
    public TransactionLimit updateLimit(Long id, BigDecimal newMaxAmount, Integer newMaxCount) {
        TransactionLimit limit = limitRepository.findById(id)
                .orElseThrow(() -> new com.cbs.common.exception.ResourceNotFoundException("TransactionLimit", "id", id));
        if (newMaxAmount != null) limit.setMaxAmount(newMaxAmount);
        if (newMaxCount != null) limit.setMaxCount(newMaxCount);
        return limitRepository.save(limit);
    }

    public List<TransactionLimit> getLimitsForAccount(Long accountId) {
        return limitRepository.findByScopeAndScopeRefIdAndIsActiveTrue(LimitScope.ACCOUNT, accountId);
    }

    public Optional<TransactionLimitUsage> getTodayUsage(Long accountId, LimitType limitType) {
        return usageRepository.findByAccountIdAndLimitTypeAndUsageDate(accountId, limitType, LocalDate.now());
    }
}
