package com.cbs.account;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.ProductCategory;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AccountValidatorTest {

    private AccountValidator validator;
    private Product product;

    @BeforeEach
    void setUp() {
        validator = new AccountValidator();
        product = Product.builder()
                .code("CA-NGN-STD").name("Standard Current")
                .productCategory(ProductCategory.CURRENT)
                .minOpeningBalance(new BigDecimal("5000.00"))
                .allowsOverdraft(false)
                .maxOverdraftLimit(new BigDecimal("100000"))
                .maxBalance(new BigDecimal("999999999.99"))
                .build();
    }

    @Test
    @DisplayName("Valid opening deposit passes")
    void validOpeningDeposit() {
        assertThatCode(() -> validator.validateOpeningDeposit(product, new BigDecimal("10000")))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Opening deposit below minimum fails")
    void openingDepositBelowMin() {
        assertThatThrownBy(() -> validator.validateOpeningDeposit(product, new BigDecimal("1000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("below minimum");
    }

    @Test
    @DisplayName("Debit on frozen account fails")
    void debitOnFrozenAccount() {
        Account account = Account.builder()
                .accountNumber("1000000001").status(AccountStatus.FROZEN)
                .bookBalance(new BigDecimal("50000"))
                .availableBalance(new BigDecimal("50000"))
                .build();
        assertThatThrownBy(() -> validator.validateDebit(account, new BigDecimal("1000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Debit not allowed");
    }

    @Test
    @DisplayName("Debit exceeding balance fails")
    void debitInsufficientBalance() {
        Account account = Account.builder()
                .accountNumber("1000000001").status(AccountStatus.ACTIVE)
                .allowDebit(true)
                .bookBalance(new BigDecimal("1000"))
                .availableBalance(new BigDecimal("1000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .build();
        assertThatThrownBy(() -> validator.validateDebit(account, new BigDecimal("5000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Insufficient balance");
    }

    @Test
    @DisplayName("Overdraft on product that disallows it fails")
    void overdraftNotAllowed() {
        assertThatThrownBy(() -> validator.validateOverdraftSetup(product, new BigDecimal("50000")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("does not allow overdraft");
    }

    @Test
    @DisplayName("Valid status transition ACTIVE -> DORMANT")
    void validStatusTransition() {
        assertThatCode(() -> validator.validateStatusTransition(AccountStatus.ACTIVE, AccountStatus.DORMANT))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Invalid status transition CLOSED -> ACTIVE")
    void invalidStatusTransition() {
        assertThatThrownBy(() -> validator.validateStatusTransition(AccountStatus.CLOSED, AccountStatus.ACTIVE))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("not allowed");
    }

    @Test
    @DisplayName("Account closure with non-zero balance fails")
    void closureWithBalance() {
        Account account = Account.builder()
                .accountNumber("1000000001").bookBalance(new BigDecimal("500"))
                .lienAmount(BigDecimal.ZERO).build();
        assertThatThrownBy(() -> validator.validateAccountClosure(account))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("non-zero balance");
    }

    @Test
    @DisplayName("Account closure with active liens fails")
    void closureWithLiens() {
        Account account = Account.builder()
                .accountNumber("1000000001").bookBalance(BigDecimal.ZERO)
                .lienAmount(new BigDecimal("10000")).build();
        assertThatThrownBy(() -> validator.validateAccountClosure(account))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("active liens");
    }
}
