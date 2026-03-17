package com.cbs.escrow;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.escrow.dto.*;
import com.cbs.escrow.entity.*;
import com.cbs.escrow.repository.EscrowMandateRepository;
import com.cbs.escrow.repository.EscrowReleaseRepository;
import com.cbs.escrow.service.EscrowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EscrowServiceTest {

    @Mock private EscrowMandateRepository mandateRepository;
    @Mock private EscrowReleaseRepository releaseRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private EscrowService escrowService;

    private Customer customer;
    private Account account;

    @BeforeEach
    void setUp() {
        customer = Customer.builder().id(1L).firstName("Test").lastName("User")
                .customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(customer)
                .currencyCode("USD").status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("500000")).availableBalance(new BigDecimal("500000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();

        lenient().when(accountPostingService.postCredit(any(Account.class), any(), any(), anyString(), any(), anyString()))
                .thenAnswer(invocation -> {
                    Account beneficiary = invocation.getArgument(0);
                    beneficiary.credit(invocation.getArgument(2));
                    return new TransactionJournal();
                });
    }

    @Test
    @DisplayName("Should create escrow mandate and place lien on account")
    void createMandate_Success() {
        CreateEscrowRequest request = CreateEscrowRequest.builder()
                .accountId(1L).escrowType(EscrowType.ESCROW)
                .purpose("Property purchase deposit").mandatedAmount(new BigDecimal("100000")).build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(mandateRepository.getNextMandateSequence()).thenReturn(400001L);
        when(mandateRepository.save(any())).thenAnswer(inv -> { EscrowMandate m = inv.getArgument(0); m.setId(1L); return m; });
        when(accountRepository.save(any())).thenReturn(account);
        when(releaseRepository.findByMandateIdOrderByCreatedAtDesc(any())).thenReturn(List.of());

        EscrowResponse result = escrowService.createMandate(request);

        assertThat(result.getMandateNumber()).startsWith("ESC");
        assertThat(result.getMandatedAmount()).isEqualByComparingTo(new BigDecimal("100000"));
        assertThat(result.getStatus()).isEqualTo(EscrowStatus.ACTIVE);
        // Lien should have been placed
        assertThat(account.getLienAmount()).isEqualByComparingTo(new BigDecimal("100000"));
    }

    @Test
    @DisplayName("Should reject mandate with insufficient balance")
    void createMandate_InsufficientBalance() {
        account.setAvailableBalance(new BigDecimal("5000"));
        CreateEscrowRequest request = CreateEscrowRequest.builder()
                .accountId(1L).escrowType(EscrowType.ESCROW)
                .purpose("Test").mandatedAmount(new BigDecimal("100000")).build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> escrowService.createMandate(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Insufficient");
    }

    @Test
    @DisplayName("Should approve and execute release, updating mandate and releasing lien")
    void approveRelease_Success() {
        EscrowMandate mandate = EscrowMandate.builder()
                .id(1L).mandateNumber("ESC000000400001").account(account).customer(customer)
                .escrowType(EscrowType.ESCROW).purpose("Test")
                .mandatedAmount(new BigDecimal("100000")).releasedAmount(BigDecimal.ZERO)
                .remainingAmount(new BigDecimal("100000")).currencyCode("USD")
                .status(EscrowStatus.ACTIVE).build();

        Account beneficiaryAccount = Account.builder().id(2L).accountNumber("1000000002")
                .bookBalance(BigDecimal.ZERO).availableBalance(BigDecimal.ZERO)
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO).build();

        EscrowRelease release = EscrowRelease.builder()
                .id(1L).mandate(mandate).releaseAmount(new BigDecimal("50000"))
                .releaseToAccount(beneficiaryAccount).releaseReason("Milestone 1 complete")
                .status("PENDING").build();

        account.setLienAmount(new BigDecimal("100000"));

        when(releaseRepository.findById(1L)).thenReturn(Optional.of(release));
        when(accountRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(mandateRepository.save(any())).thenReturn(mandate);
        when(releaseRepository.save(any())).thenReturn(release);
        when(currentActorProvider.getCurrentActor()).thenReturn("admin1");

        EscrowReleaseDto result = escrowService.approveAndExecuteRelease(1L);

        assertThat(result.getStatus()).isEqualTo("EXECUTED");
        assertThat(mandate.getStatus()).isEqualTo(EscrowStatus.PARTIALLY_RELEASED);
        assertThat(mandate.getRemainingAmount()).isEqualByComparingTo(new BigDecimal("50000"));
        assertThat(beneficiaryAccount.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("50000"));
    }
}
