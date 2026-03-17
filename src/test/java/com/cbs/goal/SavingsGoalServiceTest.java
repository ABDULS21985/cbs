package com.cbs.goal;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.goal.dto.*;
import com.cbs.goal.entity.*;
import com.cbs.goal.repository.SavingsGoalRepository;
import com.cbs.goal.repository.SavingsGoalTransactionRepository;
import com.cbs.goal.service.SavingsGoalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SavingsGoalServiceTest {

    @Mock private SavingsGoalRepository goalRepository;
    @Mock private SavingsGoalTransactionRepository goalTxnRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private SavingsGoalService goalService;

    private Customer customer;
    private Account account;
    private SavingsGoal goal;

    @BeforeEach
    void setUp() {
        lenient().when(accountPostingService.postDebit(any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                        nullable(String.class), any(TransactionChannel.class), nullable(String.class)))
                .thenAnswer(inv -> {
                    Account acct = inv.getArgument(0);
                    BigDecimal amount = inv.getArgument(2);
                    acct.debit(amount);
                    return TransactionJournal.builder().account(acct).amount(amount).build();
                });
        lenient().when(accountPostingService.postCredit(any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                        nullable(String.class), any(TransactionChannel.class), nullable(String.class)))
                .thenAnswer(inv -> {
                    Account acct = inv.getArgument(0);
                    BigDecimal amount = inv.getArgument(2);
                    acct.credit(amount);
                    return TransactionJournal.builder().account(acct).amount(amount).build();
                });
        customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer)
                .currencyCode("USD").status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("50000")).availableBalance(new BigDecimal("50000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("SA-STD").build()).build();
        goal = SavingsGoal.builder().id(1L).goalNumber("GL000000300001")
                .account(account).customer(customer)
                .goalName("Emergency Fund").targetAmount(new BigDecimal("10000"))
                .currentAmount(new BigDecimal("3000")).progressPercentage(new BigDecimal("30.00"))
                .currencyCode("USD").status(GoalStatus.ACTIVE)
                .isLocked(false).allowWithdrawalBeforeTarget(true).build();
    }

    @Test
    @DisplayName("Should create a savings goal")
    void createGoal_Success() {
        CreateGoalRequest request = CreateGoalRequest.builder()
                .accountId(1L).goalName("Holiday Fund")
                .targetAmount(new BigDecimal("5000")).currencyCode("USD").build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(goalRepository.getNextGoalSequence()).thenReturn(300001L);
        when(goalRepository.save(any())).thenAnswer(inv -> {
            SavingsGoal g = inv.getArgument(0); g.setId(1L); return g;
        });

        GoalResponse result = goalService.createGoal(1L, request);
        assertThat(result.getGoalName()).isEqualTo("Holiday Fund");
        assertThat(result.getTargetAmount()).isEqualByComparingTo(new BigDecimal("5000"));
    }

    @Test
    @DisplayName("Should fund a goal and update progress")
    void fundGoal_Success() {
        GoalFundRequest request = GoalFundRequest.builder()
                .amount(new BigDecimal("2000")).sourceAccountId(1L).build();

        when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(goalTxnRepository.save(any())).thenReturn(new SavingsGoalTransaction());
        when(goalRepository.save(any())).thenReturn(goal);

        GoalResponse result = goalService.fundGoal(1L, request);
        // 3000 + 2000 = 5000 out of 10000 = 50%
        assertThat(goal.getCurrentAmount()).isEqualByComparingTo(new BigDecimal("5000"));
        assertThat(goal.getProgressPercentage()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("Should auto-complete goal when target reached")
    void fundGoal_AutoComplete() {
        GoalFundRequest request = GoalFundRequest.builder()
                .amount(new BigDecimal("7000")).sourceAccountId(1L).build();

        when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(goalTxnRepository.save(any())).thenReturn(new SavingsGoalTransaction());
        when(goalRepository.save(any())).thenReturn(goal);

        goalService.fundGoal(1L, request);
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.COMPLETED);
        assertThat(goal.getProgressPercentage()).isEqualByComparingTo(new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("Should reject withdrawal from locked goal")
    void withdraw_LockedGoal() {
        goal.setIsLocked(true);
        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("1000")).build();

        when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));

        assertThatThrownBy(() -> goalService.withdrawFromGoal(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("locked");
    }

    @Test
    @DisplayName("Should reject withdrawal before target when not allowed")
    void withdraw_BeforeTarget_NotAllowed() {
        goal.setAllowWithdrawalBeforeTarget(false);
        GoalFundRequest request = GoalFundRequest.builder().amount(new BigDecimal("1000")).build();

        when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));

        assertThatThrownBy(() -> goalService.withdrawFromGoal(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("before target");
    }

    @Test
    @DisplayName("Should cancel goal and return funds to account")
    void cancelGoal_ReturnsFunds() {
        when(goalRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(goal));
        when(goalRepository.save(any())).thenReturn(goal);

        goalService.cancelGoal(1L);
        assertThat(goal.getStatus()).isEqualTo(GoalStatus.CANCELLED);
        assertThat(goal.getCurrentAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
