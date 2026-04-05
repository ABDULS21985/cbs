package com.cbs.mudarabah.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.mudarabah.dto.MudarabahDepositRequest;
import com.cbs.mudarabah.dto.MudarabahWithdrawalRequest;
import com.cbs.mudarabah.dto.OpenMudarabahSavingsRequest;
import com.cbs.mudarabah.entity.MudarabahAccount;
import com.cbs.mudarabah.entity.MudarabahAccountSubType;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.entity.WeightageMethod;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.rulesengine.service.DecisionTableEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MudarabahAccountServiceTest {

    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private AccountRepository accountRepository;
        @Mock private ProductRepository productRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private DecisionTableEvaluator decisionTableEvaluator;
        @Mock private CustomerRepository customerRepository;
        @Mock private CurrentActorProvider actorProvider;

    @InjectMocks private MudarabahAccountService service;

    private Account baseAccount;
        private Customer customer;
        private Product product;

    @BeforeEach
    void setUp() {
        baseAccount = Account.builder()
                .id(1L)
                .accountNumber("MDR0000000001")
                .accountName("Mudarabah Savings")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .activatedDate(LocalDate.now())
                .build();

        customer = Customer.builder()
                .id(100L)
                .status(CustomerStatus.ACTIVE)
                .build();

        product = Product.builder()
                .id(200L)
                .code("MDR-SAV")
                .build();

        when(customerRepository.findById(anyLong())).thenReturn(Optional.of(customer));
        when(productRepository.findByCode(anyString())).thenReturn(Optional.of(product));
        when(actorProvider.getCurrentActor()).thenReturn("test-user");
    }

    private OpenMudarabahSavingsRequest validRequest() {
        return OpenMudarabahSavingsRequest.builder()
                .customerId(100L)
                .productCode("MDR-SAV")
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("5000.00"))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .lossDisclosureAccepted(true)
                .profitReinvest(true)
                .build();
    }

    private MudarabahAccount buildMudarabahAccount(Account account) {
        return MudarabahAccount.builder()
                .id(10L)
                .account(account)
                .contractReference("MDR-SAV-2026-000001")
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .accountSubType(MudarabahAccountSubType.SAVINGS)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .weightageMethod(WeightageMethod.DAILY_PRODUCT)
                .cumulativeProfitReceived(BigDecimal.ZERO)
                .lossDisclosureAccepted(true)
                .lastActivityDate(LocalDate.now())
                .build();
    }

    // -----------------------------------------------------------------------
    // openMudarabahSavingsAccount tests
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("Open Mudarabah savings account with valid PSR 70:30 succeeds")
    void openMudarabahSavingsAccount_validPsr_success() {
        when(accountRepository.save(any(Account.class))).thenReturn(baseAccount);
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class)))
                .thenAnswer(invocation -> {
                    MudarabahAccount ma = invocation.getArgument(0);
                    ma.setId(10L);
                    return ma;
                });
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), eq(TransactionType.CREDIT), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), anyString(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        var response = service.openMudarabahSavingsAccount(validRequest());

        assertThat(response).isNotNull();
        assertThat(response.getProfitSharingRatioCustomer()).isEqualByComparingTo("70.0000");
        assertThat(response.getProfitSharingRatioBank()).isEqualByComparingTo("30.0000");
        assertThat(response.getAccountId()).isEqualTo(1L);

        // Verify GL posting for initial deposit
        verify(accountPostingService).postCreditAgainstGl(
                eq(baseAccount), eq(TransactionType.CREDIT),
                eq(new BigDecimal("5000.00")),
                anyString(), eq(TransactionChannel.SYSTEM),
                anyString(), eq("1100-000-001"), eq("MUDARABAH"), anyString());

        // Verify MudarabahAccount was saved with correct PSR
        ArgumentCaptor<MudarabahAccount> maCaptor = ArgumentCaptor.forClass(MudarabahAccount.class);
        verify(mudarabahAccountRepository).save(maCaptor.capture());
        MudarabahAccount savedMa = maCaptor.getValue();
        assertThat(savedMa.getProfitSharingRatioCustomer()).isEqualByComparingTo("70.0000");
        assertThat(savedMa.getProfitSharingRatioBank()).isEqualByComparingTo("30.0000");
        assertThat(savedMa.getAccountSubType()).isEqualTo(MudarabahAccountSubType.SAVINGS);
    }

    @Test
    @DisplayName("Open Mudarabah savings account with PSR sum != 100 throws PSR_SUM_INVALID")
    void openMudarabahSavingsAccount_psrSumNot100_throwsException() {
        OpenMudarabahSavingsRequest request = validRequest();
        request.setProfitSharingRatioCustomer(new BigDecimal("60.0000"));
        request.setProfitSharingRatioBank(new BigDecimal("50.0000"));

        assertThatThrownBy(() -> service.openMudarabahSavingsAccount(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("PSR_SUM_INVALID");
                });
    }

    @Test
    @DisplayName("Open Mudarabah savings account without loss disclosure throws exception")
    void openMudarabahSavingsAccount_withoutLossDisclosure_throwsException() {
        OpenMudarabahSavingsRequest request = validRequest();
        request.setLossDisclosureAccepted(false);

        assertThatThrownBy(() -> service.openMudarabahSavingsAccount(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getErrorCode()).isEqualTo("LOSS_DISCLOSURE_REQUIRED");
                });
    }

    @Test
    @DisplayName("Deposit updates pool balance via GL posting")
    void deposit_updatesPoolBalance() {
        Account activeAccount = Account.builder()
                .id(1L)
                .accountNumber("MDR0000000001")
                .accountName("Mudarabah Savings")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("10000.00"))
                .availableBalance(new BigDecimal("10000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        MudarabahAccount ma = buildMudarabahAccount(activeAccount);

        when(mudarabahAccountRepository.findByAccountId(1L)).thenReturn(Optional.of(ma));
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), eq(TransactionType.CREDIT), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), isNull(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class))).thenReturn(ma);

        MudarabahDepositRequest depositRequest = MudarabahDepositRequest.builder()
                .amount(new BigDecimal("2000.00"))
                .narration("Monthly deposit")
                .build();

        var response = service.deposit(1L, depositRequest);

        assertThat(response).isNotNull();
        verify(accountPostingService).postCreditAgainstGl(
                eq(activeAccount), eq(TransactionType.CREDIT),
                eq(new BigDecimal("2000.00")),
                eq("Monthly deposit"), eq(TransactionChannel.SYSTEM),
                isNull(), eq("1100-000-001"), eq("MUDARABAH"),
                eq("MDR-SAV-2026-000001"));
    }

    @Test
    @DisplayName("Withdraw updates pool balance via GL posting")
    void withdraw_updatesPoolBalanceAndWeight() {
        Account activeAccount = Account.builder()
                .id(1L)
                .accountNumber("MDR0000000001")
                .accountName("Mudarabah Savings")
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("10000.00"))
                .availableBalance(new BigDecimal("10000.00"))
                .lienAmount(BigDecimal.ZERO)
                .overdraftLimit(BigDecimal.ZERO)
                .openedDate(LocalDate.now())
                .build();

        MudarabahAccount ma = buildMudarabahAccount(activeAccount);

        when(mudarabahAccountRepository.findByAccountId(1L)).thenReturn(Optional.of(ma));
        when(accountPostingService.postDebitAgainstGl(
                any(Account.class), eq(TransactionType.DEBIT), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), isNull(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class))).thenReturn(ma);

        MudarabahWithdrawalRequest withdrawalRequest = MudarabahWithdrawalRequest.builder()
                .amount(new BigDecimal("3000.00"))
                .narration("Withdrawal")
                .build();

        var response = service.withdraw(1L, withdrawalRequest);

        assertThat(response).isNotNull();
        verify(accountPostingService).postDebitAgainstGl(
                eq(activeAccount), eq(TransactionType.DEBIT),
                eq(new BigDecimal("3000.00")),
                eq("Withdrawal"), eq(TransactionChannel.SYSTEM),
                isNull(), eq("1100-000-001"), eq("MUDARABAH"),
                eq("MDR-SAV-2026-000001"));
    }

    @Test
    @DisplayName("PSR is stored as ratio (0-100), not a fixed amount")
    void openMudarabahSavingsAccount_psrStoredAsRatio() {
        when(accountRepository.save(any(Account.class))).thenReturn(baseAccount);
        when(mudarabahAccountRepository.save(any(MudarabahAccount.class)))
                .thenAnswer(invocation -> {
                    MudarabahAccount ma = invocation.getArgument(0);
                    ma.setId(10L);
                    return ma;
                });
        when(accountPostingService.postCreditAgainstGl(
                any(Account.class), any(TransactionType.class), any(BigDecimal.class),
                anyString(), any(TransactionChannel.class), anyString(),
                anyString(), anyString(), anyString()))
                .thenReturn(mock(TransactionJournal.class));

        var response = service.openMudarabahSavingsAccount(validRequest());

        // PSR must be <= 100 (percentage ratio, not a currency amount)
        assertThat(response.getProfitSharingRatioCustomer()).isLessThanOrEqualTo(new BigDecimal("100"));
        assertThat(response.getProfitSharingRatioBank()).isLessThanOrEqualTo(new BigDecimal("100"));

        // Verify the sum equals 100
        BigDecimal sum = response.getProfitSharingRatioCustomer().add(response.getProfitSharingRatioBank());
        assertThat(sum).isEqualByComparingTo("100.0000");
    }
}
