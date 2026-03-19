package com.cbs.account.service;

import com.cbs.account.dto.*;
import com.cbs.account.entity.*;
import com.cbs.account.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.lifecycle.entity.AccountLifecycleEvent;
import com.cbs.lifecycle.entity.LifecycleEventType;
import com.cbs.lifecycle.repository.AccountLifecycleEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AccountMaintenanceService {

    private final AccountRepository accountRepository;
    private final AccountSignatoryRepository signatoryRepository;
    private final InterestRateOverrideRepository overrideRepository;
    private final AccountLimitRepository limitRepository;
    private final CustomerRepository customerRepository;
    private final AccountLifecycleEventRepository lifecycleEventRepository;

    // ========================================================================
    // MAINTENANCE HISTORY
    // ========================================================================

    public List<MaintenanceHistoryResponse> getMaintenanceHistory(String accountNumber) {
        Account account = findAccountOrThrow(accountNumber);
        Page<AccountLifecycleEvent> events = lifecycleEventRepository
                .findByAccountIdOrderByCreatedAtDesc(account.getId(),
                        PageRequest.of(0, 100, Sort.by(Sort.Direction.DESC, "createdAt")));

        return events.getContent().stream()
                .map(event -> MaintenanceHistoryResponse.builder()
                        .id(event.getId())
                        .date(event.getCreatedAt().toString())
                        .action(formatEventType(event.getEventType()))
                        .performedBy(event.getPerformedBy() != null ? event.getPerformedBy() : "SYSTEM")
                        .details(buildEventDetails(event))
                        .status("COMPLETED")
                        .build())
                .collect(Collectors.toList());
    }

    // ========================================================================
    // SIGNATORIES
    // ========================================================================

    public List<SignatoryDto> getSignatories(String accountNumber) {
        Account account = findAccountOrThrow(accountNumber);
        List<AccountSignatory> signatories = signatoryRepository.findByAccountIdWithCustomer(account.getId());
        return signatories.stream()
                .map(this::toSignatoryDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SignatoryDto addSignatory(String accountNumber, AddSignatoryRequest request) {
        Account account = findAccountOrThrow(accountNumber);

        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", request.getCustomerId()));

        if (signatoryRepository.existsByAccountIdAndCustomerId(account.getId(), request.getCustomerId())) {
            throw new BusinessException(
                    "Customer " + request.getCustomerId() + " is already a signatory on this account",
                    "DUPLICATE_SIGNATORY");
        }

        SignatoryType sigType;
        try {
            sigType = SignatoryType.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid signatory role: " + request.getRole(), "INVALID_SIGNATORY_ROLE");
        }

        AccountSignatory signatory = AccountSignatory.builder()
                .account(account)
                .customer(customer)
                .signatoryType(sigType)
                .signingRule(request.getSigningRule() != null ? request.getSigningRule() : "ANY")
                .isActive(true)
                .build();

        AccountSignatory saved = signatoryRepository.save(signatory);

        logEvent(account.getId(), LifecycleEventType.SIGNATORY_ADDED,
                null, null,
                String.format("Signatory added: %s (CIF: %s, Role: %s)",
                        customer.getDisplayName(), customer.getCifNumber(), sigType.name()),
                getCurrentUser());

        log.info("Signatory added: account={}, customer={}, role={}",
                account.getAccountNumber(), customer.getCifNumber(), sigType);

        return toSignatoryDto(saved);
    }

    @Transactional
    public void removeSignatory(String accountNumber, Long signatoryId, String reason) {
        Account account = findAccountOrThrow(accountNumber);

        AccountSignatory signatory = signatoryRepository.findById(signatoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Signatory", "id", signatoryId));

        if (!signatory.getAccount().getId().equals(account.getId())) {
            throw new BusinessException("Signatory does not belong to this account", "SIGNATORY_MISMATCH");
        }

        String customerName = signatory.getCustomer().getDisplayName();
        signatory.setIsActive(false);
        signatory.setEffectiveTo(java.time.LocalDate.now());
        signatoryRepository.save(signatory);

        logEvent(account.getId(), LifecycleEventType.SIGNATORY_REMOVED,
                null, null,
                String.format("Signatory removed: %s. Reason: %s", customerName, reason),
                getCurrentUser());

        log.info("Signatory removed: account={}, signatoryId={}, reason={}",
                account.getAccountNumber(), signatoryId, reason);
    }

    // ========================================================================
    // SIGNING RULE
    // ========================================================================

    @Transactional
    public void updateSigningRule(String accountNumber, String newRule) {
        Account account = findAccountOrThrow(accountNumber);

        List<AccountSignatory> signatories = signatoryRepository.findByAccountIdAndIsActiveTrue(account.getId());
        if (signatories.isEmpty()) {
            throw new BusinessException("Cannot set signing rule — account has no active signatories",
                    "NO_SIGNATORIES");
        }

        String oldRule = signatories.get(0).getSigningRule();

        for (AccountSignatory sig : signatories) {
            sig.setSigningRule(newRule);
        }
        signatoryRepository.saveAll(signatories);

        logEvent(account.getId(), LifecycleEventType.SIGNING_RULE_CHANGED,
                oldRule, newRule,
                String.format("Signing rule changed from %s to %s", oldRule, newRule),
                getCurrentUser());

        log.info("Signing rule updated: account={}, oldRule={}, newRule={}",
                account.getAccountNumber(), oldRule, newRule);
    }

    // ========================================================================
    // INTEREST RATE OVERRIDE
    // ========================================================================

    @Transactional
    public void overrideInterestRate(String accountNumber, InterestRateOverrideRequest request) {
        Account account = findAccountOrThrow(accountNumber);

        if (!request.getExpiryDate().isAfter(request.getEffectiveDate())) {
            throw new BusinessException("Expiry date must be after effective date", "INVALID_DATE_RANGE");
        }

        BigDecimal originalRate = account.getApplicableInterestRate();

        // Deactivate any existing override
        overrideRepository.deactivateAllForAccount(account.getId());

        InterestRateOverride override = InterestRateOverride.builder()
                .account(account)
                .overrideRate(request.getOverrideRate())
                .originalRate(originalRate)
                .reason(request.getReason())
                .effectiveDate(request.getEffectiveDate())
                .expiryDate(request.getExpiryDate())
                .isActive(true)
                .performedBy(getCurrentUser())
                .build();

        overrideRepository.save(override);

        // Apply the override to the account immediately if effective today or earlier
        if (!request.getEffectiveDate().isAfter(java.time.LocalDate.now())) {
            account.setApplicableInterestRate(request.getOverrideRate());
            accountRepository.save(account);
        }

        logEvent(account.getId(), LifecycleEventType.INTEREST_RATE_OVERRIDDEN,
                originalRate.toPlainString(), request.getOverrideRate().toPlainString(),
                String.format("Interest rate overridden from %s%% to %s%%. Reason: %s. Effective: %s to %s",
                        originalRate.toPlainString(), request.getOverrideRate().toPlainString(),
                        request.getReason(), request.getEffectiveDate(), request.getExpiryDate()),
                getCurrentUser());

        log.info("Interest rate override: account={}, from={}%, to={}%, effective={}-{}",
                account.getAccountNumber(), originalRate, request.getOverrideRate(),
                request.getEffectiveDate(), request.getExpiryDate());
    }

    // ========================================================================
    // TRANSACTION LIMITS
    // ========================================================================

    @Transactional
    public void changeTransactionLimit(String accountNumber, LimitChangeRequest request) {
        Account account = findAccountOrThrow(accountNumber);

        AccountLimit existing = limitRepository
                .findByAccountIdAndLimitType(account.getId(), request.getLimitType())
                .orElse(null);

        BigDecimal previousValue = existing != null ? existing.getLimitValue() : BigDecimal.ZERO;

        if (existing != null) {
            existing.setPreviousValue(previousValue);
            existing.setLimitValue(request.getNewValue());
            existing.setReason(request.getReason());
            existing.setEffectiveDate(java.time.LocalDate.now());
            existing.setPerformedBy(getCurrentUser());
            limitRepository.save(existing);
        } else {
            AccountLimit newLimit = AccountLimit.builder()
                    .account(account)
                    .limitType(request.getLimitType())
                    .limitValue(request.getNewValue())
                    .previousValue(previousValue)
                    .reason(request.getReason())
                    .effectiveDate(java.time.LocalDate.now())
                    .performedBy(getCurrentUser())
                    .build();
            limitRepository.save(newLimit);
        }

        logEvent(account.getId(), LifecycleEventType.LIMIT_CHANGED,
                previousValue.toPlainString(), request.getNewValue().toPlainString(),
                String.format("Limit %s changed from %s to %s. Reason: %s",
                        request.getLimitType(), previousValue.toPlainString(),
                        request.getNewValue().toPlainString(), request.getReason()),
                getCurrentUser());

        log.info("Limit changed: account={}, type={}, from={}, to={}",
                account.getAccountNumber(), request.getLimitType(), previousValue, request.getNewValue());
    }

    // ========================================================================
    // OFFICER CHANGE
    // ========================================================================

    @Transactional
    public void changeAccountOfficer(String accountNumber, OfficerChangeRequest request) {
        Account account = findAccountOrThrow(accountNumber);

        String previousOfficer = account.getRelationshipManager();

        account.setRelationshipManager(request.getOfficerName());
        accountRepository.save(account);

        logEvent(account.getId(), LifecycleEventType.OFFICER_CHANGED,
                previousOfficer, request.getOfficerName(),
                String.format("Relationship officer changed from '%s' to '%s' (ID: %s). Reason: %s. Effective: %s",
                        previousOfficer != null ? previousOfficer : "N/A",
                        request.getOfficerName(), request.getOfficerId(),
                        request.getReason(), request.getEffectiveDate()),
                getCurrentUser());

        log.info("Officer changed: account={}, from={}, to={} (ID: {})",
                account.getAccountNumber(), previousOfficer, request.getOfficerName(), request.getOfficerId());
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private Account findAccountOrThrow(String accountNumber) {
        return accountRepository.findByAccountNumberWithDetails(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "accountNumber", accountNumber));
    }

    private void logEvent(Long accountId, LifecycleEventType eventType,
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

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return "SYSTEM";
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String username = jwt.getClaimAsString("preferred_username");
            return username != null ? username : jwt.getSubject();
        }
        if (principal instanceof String name) {
            return name;
        }
        return "SYSTEM";
    }

    private SignatoryDto toSignatoryDto(AccountSignatory signatory) {
        return SignatoryDto.builder()
                .id(signatory.getId())
                .customerId(signatory.getCustomer().getId())
                .customerCifNumber(signatory.getCustomer().getCifNumber())
                .customerDisplayName(signatory.getCustomer().getDisplayName())
                .signatoryType(signatory.getSignatoryType())
                .signingRule(signatory.getSigningRule())
                .isActive(signatory.getIsActive())
                .effectiveFrom(signatory.getEffectiveFrom())
                .effectiveTo(signatory.getEffectiveTo())
                .build();
    }

    private String formatEventType(LifecycleEventType type) {
        return switch (type) {
            case OPENED -> "Account Opened";
            case ACTIVATED -> "Account Activated";
            case STATUS_CHANGED -> "Status Changed";
            case DORMANCY_DETECTED -> "Dormancy Detected";
            case REACTIVATED -> "Account Reactivated";
            case FROZEN -> "Account Frozen";
            case UNFROZEN -> "Account Unfrozen";
            case PND_PLACED -> "PND Placed";
            case PND_REMOVED -> "PND Removed";
            case CLOSED -> "Account Closed";
            case ESCHEAT -> "Account Escheated";
            case FEE_CHARGED -> "Fee Charged";
            case INTEREST_POSTED -> "Interest Posted";
            case MANDATE_CHANGED -> "Mandate Changed";
            case SIGNATORY_ADDED -> "Signatory Added";
            case SIGNATORY_REMOVED -> "Signatory Removed";
            case SIGNING_RULE_CHANGED -> "Signing Rule Changed";
            case INTEREST_RATE_OVERRIDDEN -> "Interest Rate Override";
            case LIMIT_CHANGED -> "Limit Changed";
            case OFFICER_CHANGED -> "Officer Changed";
        };
    }

    private String buildEventDetails(AccountLifecycleEvent event) {
        StringBuilder sb = new StringBuilder();
        if (event.getReason() != null) {
            sb.append(event.getReason());
        }
        if (event.getOldStatus() != null && event.getNewStatus() != null) {
            if (sb.length() > 0) sb.append(" | ");
            sb.append("Changed from ").append(event.getOldStatus())
                    .append(" to ").append(event.getNewStatus());
        }
        return sb.length() > 0 ? sb.toString() : formatEventType(event.getEventType());
    }
}
