package com.cbs.account.validation;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Set;

@Component
@Slf4j
public class AccountValidator {

    private static final Set<String> ALLOWED_ACCOUNT_STATUS_TRANSITIONS = Set.of(
            "PENDING_ACTIVATION->ACTIVE",
            "ACTIVE->DORMANT",
            "ACTIVE->FROZEN",
            "ACTIVE->PND_DEBIT",
            "ACTIVE->PND_CREDIT",
            "ACTIVE->CLOSED",
            "DORMANT->ACTIVE",
            "DORMANT->CLOSED",
            "DORMANT->ESCHEAT",
            "FROZEN->ACTIVE",
            "FROZEN->CLOSED",
            "PND_DEBIT->ACTIVE",
            "PND_CREDIT->ACTIVE"
    );

    public void validateOpeningDeposit(Product product, BigDecimal initialDeposit) {
        if (initialDeposit != null && initialDeposit.compareTo(BigDecimal.ZERO) > 0) {
            if (initialDeposit.compareTo(product.getMinOpeningBalance()) < 0) {
                throw new BusinessException(
                        String.format("Initial deposit ₦%s is below minimum opening balance ₦%s for product %s",
                                initialDeposit.toPlainString(),
                                product.getMinOpeningBalance().toPlainString(),
                                product.getName()),
                        "BELOW_MIN_OPENING_BALANCE"
                );
            }
        }
    }

    public void validateDebit(Account account, BigDecimal amount) {
        if (!account.isDebitAllowed()) {
            throw new BusinessException(
                    String.format("Debit not allowed on account %s (status: %s)",
                            account.getAccountNumber(), account.getStatus()),
                    HttpStatus.FORBIDDEN,
                    "DEBIT_NOT_ALLOWED"
            );
        }
        if (!account.hasSufficientBalance(amount)) {
            throw new BusinessException(
                    String.format("Insufficient balance. Available: ₦%s, Requested: ₦%s",
                            account.getAvailableBalance().toPlainString(),
                            amount.toPlainString()),
                    "INSUFFICIENT_BALANCE"
            );
        }
    }

    public void validateCredit(Account account, BigDecimal amount) {
        if (!account.isCreditAllowed()) {
            throw new BusinessException(
                    String.format("Credit not allowed on account %s (status: %s)",
                            account.getAccountNumber(), account.getStatus()),
                    HttpStatus.FORBIDDEN,
                    "CREDIT_NOT_ALLOWED"
            );
        }
        Product product = account.getProduct();
        if (product.getMaxBalance() != null) {
            BigDecimal projectedBalance = account.getBookBalance().add(amount);
            if (projectedBalance.compareTo(product.getMaxBalance()) > 0) {
                throw new BusinessException(
                        String.format("Credit would exceed max balance ₦%s for product %s",
                                product.getMaxBalance().toPlainString(), product.getName()),
                        "EXCEEDS_MAX_BALANCE"
                );
            }
        }
    }

    public void validateOverdraftSetup(Product product, BigDecimal requestedLimit) {
        if (requestedLimit != null && requestedLimit.compareTo(BigDecimal.ZERO) > 0) {
            if (!Boolean.TRUE.equals(product.getAllowsOverdraft())) {
                throw new BusinessException(
                        "Product " + product.getCode() + " does not allow overdraft facilities",
                        "OVERDRAFT_NOT_ALLOWED"
                );
            }
            if (product.getMaxOverdraftLimit() != null &&
                    requestedLimit.compareTo(product.getMaxOverdraftLimit()) > 0) {
                throw new BusinessException(
                        String.format("Requested overdraft ₦%s exceeds max limit ₦%s",
                                requestedLimit.toPlainString(),
                                product.getMaxOverdraftLimit().toPlainString()),
                        "EXCEEDS_MAX_OVERDRAFT"
                );
            }
        }
    }

    public void validateStatusTransition(AccountStatus current, AccountStatus target) {
        String transition = current.name() + "->" + target.name();
        if (!ALLOWED_ACCOUNT_STATUS_TRANSITIONS.contains(transition)) {
            throw new BusinessException(
                    String.format("Account status transition from %s to %s is not allowed", current, target),
                    "INVALID_ACCOUNT_STATUS_TRANSITION"
            );
        }
    }

    public void validateAccountClosure(Account account) {
        if (account.getBookBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessException(
                    String.format("Account %s has non-zero balance ₦%s. Clear balance before closure.",
                            account.getAccountNumber(), account.getBookBalance().toPlainString()),
                    "NON_ZERO_BALANCE"
            );
        }
        if (account.getLienAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException(
                    String.format("Account %s has active liens totalling ₦%s",
                            account.getAccountNumber(), account.getLienAmount().toPlainString()),
                    "ACTIVE_LIENS"
            );
        }
    }
}
