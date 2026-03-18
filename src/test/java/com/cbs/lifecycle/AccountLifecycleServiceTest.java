package com.cbs.lifecycle;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.config.CbsProperties;
import com.cbs.lifecycle.entity.LifecycleEventType;
import com.cbs.lifecycle.repository.AccountLifecycleEventRepository;
import com.cbs.lifecycle.service.AccountLifecycleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountLifecycleServiceTest {

    @Mock private AccountRepository accountRepository;
    @Mock private AccountLifecycleEventRepository lifecycleEventRepository;
    private AccountLifecycleService lifecycleService;
    private CbsProperties cbsProperties;

    private Product product;

    @BeforeEach
    void setUp() {
        cbsProperties = new CbsProperties();
        lifecycleService = new AccountLifecycleService(accountRepository, lifecycleEventRepository, cbsProperties);
        product = Product.builder()
                .id(1L).code("SA-NGN-STD").dormancyDays(365).build();
    }

    @Test
    @DisplayName("Should detect dormant accounts past dormancy threshold")
    void detectDormancy_MarksAccountsDormant() {
        Account staleAccount = Account.builder()
                .id(1L).accountNumber("1000000001").status(AccountStatus.ACTIVE)
                .product(product)
                .lastTransactionDate(LocalDate.now().minusDays(400))
                .bookBalance(new BigDecimal("5000"))
                .build();

        Account recentAccount = Account.builder()
                .id(2L).accountNumber("1000000002").status(AccountStatus.ACTIVE)
                .product(product)
                .lastTransactionDate(LocalDate.now().minusDays(30))
                .bookBalance(new BigDecimal("10000"))
                .build();

        when(accountRepository.findAll()).thenReturn(List.of(staleAccount, recentAccount));
        when(accountRepository.save(any())).thenReturn(staleAccount);
        when(lifecycleEventRepository.save(any())).thenReturn(null);

        int dormantCount = lifecycleService.detectDormantAccounts();

        assertThat(dormantCount).isEqualTo(1);
        assertThat(staleAccount.getStatus()).isEqualTo(AccountStatus.DORMANT);
        assertThat(staleAccount.getDormancyDate()).isEqualTo(LocalDate.now());
        verify(accountRepository, times(1)).save(staleAccount);
    }

    @Test
    @DisplayName("Should reactivate dormant account")
    void reactivateAccount_Success() {
        Account dormantAccount = Account.builder()
                .id(5L).accountNumber("1000000005").status(AccountStatus.DORMANT)
                .dormancyDate(LocalDate.now().minusDays(100))
                .build();

        when(accountRepository.findById(5L)).thenReturn(Optional.of(dormantAccount));
        when(accountRepository.save(any())).thenReturn(dormantAccount);
        when(lifecycleEventRepository.save(any())).thenReturn(null);

        lifecycleService.reactivateAccount(5L, "officer1");

        assertThat(dormantAccount.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(dormantAccount.getDormancyDate()).isNull();
        assertThat(dormantAccount.getLastTransactionDate()).isEqualTo(LocalDate.now());
    }

    @Test
    @DisplayName("Should detect escheatment candidates (6+ years dormant)")
    void detectEscheatment_FindsCandidates() {
        Account oldDormant = Account.builder()
                .id(10L).accountNumber("1000000010").status(AccountStatus.DORMANT)
                .dormancyDate(LocalDate.now().minusYears(7))
                .build();

        cbsProperties.getLifecycle().setEscheatmentYears(6);

        LocalDate cutoff = LocalDate.now().minusYears(6);
        when(accountRepository.findAccountsEligibleForEscheatment(cutoff))
                .thenReturn(List.of(oldDormant));
        when(accountRepository.save(any())).thenReturn(oldDormant);
        when(lifecycleEventRepository.save(any())).thenReturn(null);

        int count = lifecycleService.detectEscheatmentCandidates();

        assertThat(count).isEqualTo(1);
        assertThat(oldDormant.getStatus()).isEqualTo(AccountStatus.ESCHEAT);
    }

    @Test
    @DisplayName("Should skip reactivation for non-dormant accounts")
    void reactivateAccount_SkipNonDormant() {
        Account activeAccount = Account.builder()
                .id(3L).status(AccountStatus.ACTIVE).build();

        when(accountRepository.findById(3L)).thenReturn(Optional.of(activeAccount));

        lifecycleService.reactivateAccount(3L, "officer1");

        verify(accountRepository, never()).save(any());
    }
}
