package com.cbs.lifecycle.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.lifecycle.dto.LifecycleEventDto;
import com.cbs.lifecycle.entity.AccountLifecycleEvent;
import com.cbs.lifecycle.entity.LifecycleEventType;
import com.cbs.lifecycle.repository.AccountLifecycleEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AccountLifecycleService {

    private final AccountRepository accountRepository;
    private final AccountLifecycleEventRepository lifecycleEventRepository;
    private final CbsProperties cbsProperties;

    /**
     * Scans all active accounts and marks those without transactions
     * beyond the product's dormancy threshold as DORMANT.
     */
    @Transactional
    public int detectDormantAccounts() {
        int dormantCount = 0;
        // Get all active accounts grouped by product dormancy days
        List<Account> activeAccounts = accountRepository.findAll().stream()
                .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                .filter(a -> a.getProduct() != null)
                .toList();

        for (Account account : activeAccounts) {
            int dormancyDays = account.getProduct().getDormancyDays();
            LocalDate cutoff = LocalDate.now().minusDays(dormancyDays);

            if (account.getLastTransactionDate() != null &&
                    account.getLastTransactionDate().isBefore(cutoff)) {
                account.setStatus(AccountStatus.DORMANT);
                account.setDormancyDate(LocalDate.now());
                accountRepository.save(account);

                logEvent(account.getId(), LifecycleEventType.DORMANCY_DETECTED,
                        AccountStatus.ACTIVE.name(), AccountStatus.DORMANT.name(),
                        String.format("No transactions since %s (%d days dormancy threshold)",
                                account.getLastTransactionDate(), dormancyDays),
                        "SYSTEM");
                dormantCount++;
            }
        }

        log.info("Dormancy detection complete: {} accounts marked dormant", dormantCount);
        return dormantCount;
    }

    /**
     * Reactivates a dormant account (triggered by a new transaction or manual action).
     */
    @Transactional
    public void reactivateAccount(Long accountId, String performedBy) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        if (account.getStatus() != AccountStatus.DORMANT) {
            return; // Only dormant accounts can be reactivated
        }

        account.setStatus(AccountStatus.ACTIVE);
        account.setDormancyDate(null);
        account.setLastTransactionDate(LocalDate.now());
        accountRepository.save(account);

        logEvent(accountId, LifecycleEventType.REACTIVATED,
                AccountStatus.DORMANT.name(), AccountStatus.ACTIVE.name(),
                "Account reactivated", performedBy);

        log.info("Account {} reactivated by {}", account.getAccountNumber(), performedBy);
    }

    /**
     * Detects dormant accounts eligible for escheatment per configured threshold.
     */
    @Transactional
    public int detectEscheatmentCandidates() {
        int escheatYears = cbsProperties.getLifecycle().getEscheatmentYears();
        LocalDate escheatCutoff = LocalDate.now().minusYears(escheatYears);
        List<Account> candidates = accountRepository.findAccountsEligibleForEscheatment(escheatCutoff);
        int count = 0;

        for (Account account : candidates) {
            account.setStatus(AccountStatus.ESCHEAT);
            accountRepository.save(account);

            logEvent(account.getId(), LifecycleEventType.ESCHEAT,
                    AccountStatus.DORMANT.name(), AccountStatus.ESCHEAT.name(),
                    String.format("Account escheated after %d years of dormancy per regulatory guidelines", escheatYears),
                    "SYSTEM");
            count++;
        }

        log.info("Escheatment detection complete: {} accounts escheated", count);
        return count;
    }

    /**
     * Logs a lifecycle event for audit trail.
     */
    @Transactional
    public void logEvent(Long accountId, LifecycleEventType eventType,
                          String oldStatus, String newStatus,
                          String reason, String performedBy) {
        AccountLifecycleEvent event = AccountLifecycleEvent.builder()
                .accountId(accountId)
                .eventType(eventType)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .reason(reason)
                .performedBy(performedBy)
                .createdAt(Instant.now())
                .build();
        lifecycleEventRepository.save(event);
    }

    public Page<LifecycleEventDto> getAccountLifecycleHistory(Long accountId, Pageable pageable) {
        accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));

        return lifecycleEventRepository.findByAccountIdOrderByCreatedAtDesc(accountId, pageable)
                .map(this::toDto);
    }

    public Page<LifecycleEventDto> getAccountLifecycleHistoryByNumber(String accountNumber, Pageable pageable) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));

        return lifecycleEventRepository.findByAccountIdOrderByCreatedAtDesc(account.getId(), pageable)
                .map(this::toDto);
    }

    private LifecycleEventDto toDto(AccountLifecycleEvent event) {
        return LifecycleEventDto.builder()
                .id(event.getId())
                .accountId(event.getAccountId())
                .eventType(event.getEventType().name())
                .oldStatus(event.getOldStatus())
                .newStatus(event.getNewStatus())
                .reason(event.getReason())
                .performedBy(event.getPerformedBy())
                .createdAt(event.getCreatedAt())
                .build();
    }
}
