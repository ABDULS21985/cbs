package com.cbs.custody.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.repository.CustodyAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustodyService {

    private final CustodyAccountRepository custodyRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Open Account ────────────────────────────────────────────────────────

    @Transactional
    public CustodyAccount open(CustodyAccount account) {
        // Validation
        if (account.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (!StringUtils.hasText(account.getAccountName())) {
            throw new BusinessException("Account name is required", "MISSING_ACCOUNT_NAME");
        }
        if (!StringUtils.hasText(account.getAccountType())) {
            throw new BusinessException("Account type is required", "MISSING_ACCOUNT_TYPE");
        }
        List<String> validTypes = List.of("INDIVIDUAL", "INSTITUTIONAL", "OMNIBUS", "NOMINEE", "SEGREGATED");
        if (!validTypes.contains(account.getAccountType())) {
            throw new BusinessException(
                    "Invalid account type: " + account.getAccountType() + ". Valid types: " + validTypes,
                    "INVALID_ACCOUNT_TYPE");
        }

        // Duplicate detection: same customer + same account type + ACTIVE
        List<CustodyAccount> existing = custodyRepository
                .findByCustomerIdAndStatusOrderByAccountNameAsc(account.getCustomerId(), "ACTIVE");
        boolean duplicate = existing.stream()
                .anyMatch(a -> a.getAccountType().equals(account.getAccountType())
                        && a.getAccountName().equalsIgnoreCase(account.getAccountName()));
        if (duplicate) {
            throw new BusinessException(
                    String.format("Customer %d already has an active %s custody account with name '%s'",
                            account.getCustomerId(), account.getAccountType(), account.getAccountName()),
                    "DUPLICATE_CUSTODY_ACCOUNT");
        }

        account.setAccountCode("CUS-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        account.setOpenedAt(Instant.now());
        account.setStatus("ACTIVE");
        if (account.getTotalAssetsValue() == null) {
            account.setTotalAssetsValue(BigDecimal.ZERO);
        }
        if (account.getSecuritiesCount() == null) {
            account.setSecuritiesCount(0);
        }

        CustodyAccount saved = custodyRepository.save(account);
        log.info("Custody account opened: code={}, customer={}, type={}, actor={}",
                saved.getAccountCode(), saved.getCustomerId(), saved.getAccountType(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Update Account ──────────────────────────────────────────────────────

    @Transactional
    public CustodyAccount update(String accountCode, CustodyAccount updates) {
        CustodyAccount account = getByCode(accountCode);
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE accounts can be updated; current status: " + account.getStatus(),
                    "INVALID_ACCOUNT_STATUS");
        }
        if (updates.getAccountName() != null) account.setAccountName(updates.getAccountName());
        if (updates.getSettlementEnabled() != null) account.setSettlementEnabled(updates.getSettlementEnabled());
        if (updates.getCorporateActions() != null) account.setCorporateActions(updates.getCorporateActions());
        if (updates.getIncomeCollection() != null) account.setIncomeCollection(updates.getIncomeCollection());
        if (updates.getProxyVoting() != null) account.setProxyVoting(updates.getProxyVoting());
        if (updates.getTaxReclaim() != null) account.setTaxReclaim(updates.getTaxReclaim());
        if (updates.getFxServices() != null) account.setFxServices(updates.getFxServices());
        if (updates.getSecuritiesLending() != null) account.setSecuritiesLending(updates.getSecuritiesLending());
        if (updates.getSubCustodian() != null) account.setSubCustodian(updates.getSubCustodian());
        if (updates.getDepositoryId() != null) account.setDepositoryId(updates.getDepositoryId());
        if (updates.getCustodyFeeBps() != null) account.setCustodyFeeBps(updates.getCustodyFeeBps());
        if (updates.getTransactionFee() != null) account.setTransactionFee(updates.getTransactionFee());

        CustodyAccount saved = custodyRepository.save(account);
        log.info("Custody account updated: code={}, actor={}", accountCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Close Account ───────────────────────────────────────────────────────

    @Transactional
    public CustodyAccount close(String accountCode) {
        CustodyAccount account = getByCode(accountCode);
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE accounts can be closed; current status: " + account.getStatus(),
                    "INVALID_ACCOUNT_STATUS");
        }
        if (account.getSecuritiesCount() != null && account.getSecuritiesCount() > 0) {
            throw new BusinessException(
                    String.format("Cannot close account with %d securities held; transfer or liquidate first",
                            account.getSecuritiesCount()),
                    "SECURITIES_STILL_HELD");
        }
        account.setStatus("CLOSED");
        CustodyAccount saved = custodyRepository.save(account);
        log.info("Custody account closed: code={}, actor={}", accountCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Asset Holding Management ────────────────────────────────────────────

    @Transactional
    public CustodyAccount addHolding(String accountCode, String securityName, BigDecimal marketValue) {
        CustodyAccount account = getByCode(accountCode);
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new BusinessException("Cannot add holdings to a non-ACTIVE account", "INVALID_ACCOUNT_STATUS");
        }
        if (marketValue == null || marketValue.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Market value must be greater than zero", "INVALID_MARKET_VALUE");
        }

        account.setSecuritiesCount(account.getSecuritiesCount() + 1);
        account.setTotalAssetsValue(account.getTotalAssetsValue().add(marketValue));

        CustodyAccount saved = custodyRepository.save(account);
        log.info("Holding added: account={}, security={}, value={}, actor={}",
                accountCode, securityName, marketValue, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public CustodyAccount removeHolding(String accountCode, String securityName, BigDecimal marketValue) {
        CustodyAccount account = getByCode(accountCode);
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new BusinessException("Cannot remove holdings from a non-ACTIVE account", "INVALID_ACCOUNT_STATUS");
        }
        if (account.getSecuritiesCount() <= 0) {
            throw new BusinessException("No securities to remove", "NO_SECURITIES_HELD");
        }

        account.setSecuritiesCount(account.getSecuritiesCount() - 1);
        BigDecimal newValue = account.getTotalAssetsValue().subtract(marketValue);
        account.setTotalAssetsValue(newValue.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : newValue);

        CustodyAccount saved = custodyRepository.save(account);
        log.info("Holding removed: account={}, security={}, value={}, actor={}",
                accountCode, securityName, marketValue, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Corporate Action Processing ─────────────────────────────────────────

    @Transactional
    public CustodyAccount processCorporateAction(String accountCode, String actionType, BigDecimal factor) {
        CustodyAccount account = getByCode(accountCode);
        if (!"ACTIVE".equals(account.getStatus())) {
            throw new BusinessException("Cannot process corporate actions on a non-ACTIVE account", "INVALID_ACCOUNT_STATUS");
        }
        if (!account.getCorporateActions()) {
            throw new BusinessException("Corporate actions are not enabled on this account", "CORPORATE_ACTIONS_DISABLED");
        }
        if (factor == null || factor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Corporate action factor must be greater than zero", "INVALID_FACTOR");
        }

        switch (actionType.toUpperCase()) {
            case "DIVIDEND" -> {
                // Cash dividend: add dividend amount to total asset value
                account.setTotalAssetsValue(account.getTotalAssetsValue().add(factor));
                log.info("Dividend processed: account={}, amount={}", accountCode, factor);
            }
            case "STOCK_SPLIT" -> {
                // Stock split: multiply securities count by factor, divide asset value per unit
                int newCount = BigDecimal.valueOf(account.getSecuritiesCount()).multiply(factor).intValue();
                account.setSecuritiesCount(newCount);
                // Total value stays the same in a split
                log.info("Stock split processed: account={}, factor={}, newCount={}", accountCode, factor, newCount);
            }
            case "RIGHTS_ISSUE" -> {
                // Rights issue: increase securities count proportionally
                int additionalUnits = BigDecimal.valueOf(account.getSecuritiesCount()).multiply(factor).intValue();
                account.setSecuritiesCount(account.getSecuritiesCount() + additionalUnits);
                log.info("Rights issue processed: account={}, additionalUnits={}", accountCode, additionalUnits);
            }
            case "BONUS_ISSUE" -> {
                int bonusUnits = BigDecimal.valueOf(account.getSecuritiesCount()).multiply(factor).intValue();
                account.setSecuritiesCount(account.getSecuritiesCount() + bonusUnits);
                log.info("Bonus issue processed: account={}, bonusUnits={}", accountCode, bonusUnits);
            }
            default -> throw new BusinessException("Unknown corporate action type: " + actionType, "INVALID_ACTION_TYPE");
        }

        CustodyAccount saved = custodyRepository.save(account);
        log.info("Corporate action completed: account={}, type={}, actor={}",
                accountCode, actionType, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Fee Calculation ─────────────────────────────────────────────────────

    public BigDecimal calculateCustodyFee(String accountCode) {
        CustodyAccount account = getByCode(accountCode);
        BigDecimal annualFee = BigDecimal.ZERO;

        // Custody fee: basis points on total assets value (annual)
        if (account.getCustodyFeeBps() != null && account.getCustodyFeeBps() > 0) {
            BigDecimal bpsRate = BigDecimal.valueOf(account.getCustodyFeeBps())
                    .divide(new BigDecimal("10000"), 8, RoundingMode.HALF_UP);
            annualFee = account.getTotalAssetsValue().multiply(bpsRate).setScale(2, RoundingMode.HALF_UP);
        }

        // Transaction fee (per-transaction, returned as a separate component)
        BigDecimal txnFee = account.getTransactionFee() != null ? account.getTransactionFee() : BigDecimal.ZERO;

        log.info("Fee calculated: account={}, annualCustodyFee={}, perTxnFee={}",
                accountCode, annualFee, txnFee);
        return annualFee;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public CustodyAccount getByCode(String code) {
        return custodyRepository.findByAccountCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CustodyAccount", "accountCode", code));
    }

    public List<CustodyAccount> getByCustomer(Long customerId) {
        return custodyRepository.findByCustomerIdAndStatusOrderByAccountNameAsc(customerId, "ACTIVE");
    }

    public List<CustodyAccount> getAll() {
        return custodyRepository.findAll();
    }
}
