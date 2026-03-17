package com.cbs.cheque;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.cheque.entity.*;
import com.cbs.cheque.repository.*;
import com.cbs.cheque.service.ChequeService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class ChequeServiceTest {

    @Mock private ChequeBookRepository bookRepository;
    @Mock private ChequeLeafRepository leafRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;

    @InjectMocks private ChequeService chequeService;

    private Account account;
    private ChequeBook book;
    private ChequeLeaf leaf;

    @BeforeEach
    void setUp() {
        Customer c = Customer.builder().id(1L).firstName("Test").lastName("User").customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(c).currencyCode("USD")
                .bookBalance(new BigDecimal("50000")).availableBalance(new BigDecimal("50000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();
        book = ChequeBook.builder().id(1L).account(account).customer(c).seriesPrefix("CHQ")
                .startNumber(1).endNumber(25).totalLeaves(25).usedLeaves(0).spoiledLeaves(0).status("ACTIVE").build();
        leaf = ChequeLeaf.builder().id(1L).chequeBook(book).chequeNumber("CHQ000001").account(account)
                .currencyCode("USD").status(ChequeStatus.UNUSED).build();

        lenient().when(accountPostingService.postDebit(any(Account.class), any(), any(), anyString(), any(), anyString()))
                .thenAnswer(invocation -> {
                    Account fundingAccount = invocation.getArgument(0);
                    fundingAccount.debit(invocation.getArgument(2));
                    return new TransactionJournal();
                });
    }

    @Test
    @DisplayName("Should present cheque and move to CLEARING status")
    void presentCheque_Success() {
        when(leafRepository.findByAccountIdAndChequeNumber(1L, "CHQ000001")).thenReturn(Optional.of(leaf));
        when(leafRepository.save(any())).thenReturn(leaf);

        ChequeLeaf result = chequeService.presentCheque(1L, "CHQ000001", new BigDecimal("5000"), "John Doe", "BANK001");

        assertThat(result.getStatus()).isEqualTo(ChequeStatus.CLEARING);
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("5000"));
        assertThat(result.getPayeeName()).isEqualTo("John Doe");
    }

    @Test
    @DisplayName("Should reject stopped cheque")
    void presentCheque_Stopped() {
        leaf.setStatus(ChequeStatus.STOPPED);
        leaf.setStopReason("Reported lost");
        when(leafRepository.findByAccountIdAndChequeNumber(1L, "CHQ000001")).thenReturn(Optional.of(leaf));

        assertThatThrownBy(() -> chequeService.presentCheque(1L, "CHQ000001", new BigDecimal("5000"), "John", null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("stopped");
    }

    @Test
    @DisplayName("Should return cheque on insufficient funds")
    void presentCheque_InsufficientFunds() {
        account.setAvailableBalance(new BigDecimal("100"));
        when(leafRepository.findByAccountIdAndChequeNumber(1L, "CHQ000001")).thenReturn(Optional.of(leaf));
        when(leafRepository.save(any())).thenReturn(leaf);
        when(bookRepository.save(any())).thenReturn(book);

        assertThatThrownBy(() -> chequeService.presentCheque(1L, "CHQ000001", new BigDecimal("5000"), "John", null))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Insufficient");
        assertThat(leaf.getStatus()).isEqualTo(ChequeStatus.RETURNED);
    }

    @Test
    @DisplayName("Should clear cheque and debit account")
    void clearCheque_Success() {
        leaf.setStatus(ChequeStatus.CLEARING);
        leaf.setAmount(new BigDecimal("5000"));
        when(leafRepository.findById(1L)).thenReturn(Optional.of(leaf));
        when(leafRepository.save(any())).thenReturn(leaf);
        when(bookRepository.save(any())).thenReturn(book);

        ChequeLeaf result = chequeService.clearCheque(1L);

        assertThat(result.getStatus()).isEqualTo(ChequeStatus.CLEARED);
        assertThat(account.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("45000"));
    }

    @Test
    @DisplayName("Should stop cheque payment")
    void stopCheque_Success() {
        when(leafRepository.findByAccountIdAndChequeNumber(1L, "CHQ000001")).thenReturn(Optional.of(leaf));
        when(leafRepository.save(any())).thenReturn(leaf);

        ChequeLeaf result = chequeService.stopCheque(1L, "CHQ000001", "Lost cheque book", "customer1");

        assertThat(result.getStatus()).isEqualTo(ChequeStatus.STOPPED);
        assertThat(result.getStopReason()).isEqualTo("Lost cheque book");
    }
}
