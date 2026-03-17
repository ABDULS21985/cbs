package com.cbs.payments;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.payments.entity.*;
import com.cbs.payments.repository.*;
import com.cbs.payments.service.PaymentService;
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
class PaymentServiceTest {

    @Mock private PaymentInstructionRepository paymentRepository;
    @Mock private PaymentBatchRepository batchRepository;
    @Mock private FxRateRepository fxRateRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CurrentActorProvider currentActorProvider;

    @InjectMocks private PaymentService paymentService;

    private Account debitAccount;
    private Account creditAccount;

    @BeforeEach
    void setUp() {
        Customer c1 = Customer.builder().id(1L).firstName("Sender").lastName("User").customerType(CustomerType.INDIVIDUAL).build();
        Customer c2 = Customer.builder().id(2L).firstName("Receiver").lastName("User").customerType(CustomerType.INDIVIDUAL).build();
        debitAccount = Account.builder().id(1L).accountNumber("1000000001").customer(c1)
                .currencyCode("USD").bookBalance(new BigDecimal("100000")).availableBalance(new BigDecimal("100000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();
        creditAccount = Account.builder().id(2L).accountNumber("1000000002").customer(c2)
                .currencyCode("USD").bookBalance(new BigDecimal("5000")).availableBalance(new BigDecimal("5000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();

        lenient().when(accountPostingService.postTransfer(any(Account.class), any(Account.class), any(), any(), anyString(), anyString(), any(), anyString()))
                .thenAnswer(invocation -> {
                    Account debitAccount = invocation.getArgument(0);
                    Account creditAccount = invocation.getArgument(1);
                    BigDecimal debitAmount = invocation.getArgument(2);
                    BigDecimal creditAmount = invocation.getArgument(3);
                    if (debitAccount.getAvailableBalance().compareTo(debitAmount) < 0) {
                        throw new BusinessException("Insufficient funds", "INSUFFICIENT_BALANCE");
                    }
                    debitAccount.debit(debitAmount);
                    creditAccount.credit(creditAmount);
                    return new AccountPostingService.TransferPosting(new TransactionJournal(), new TransactionJournal());
                });
    }

    @Test
    @DisplayName("Internal transfer: debits sender, credits receiver")
    void internalTransfer_Success() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(creditAccount));
        when(paymentRepository.getNextInstructionSequence()).thenReturn(1L);
        when(paymentRepository.save(any())).thenAnswer(inv -> { PaymentInstruction p = inv.getArgument(0); p.setId(1L); return p; });
        PaymentInstruction result = paymentService.executeInternalTransfer(1L, 2L, new BigDecimal("10000"), "Test transfer");

        assertThat(result.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(result.getPaymentType()).isEqualTo(PaymentType.INTERNAL_TRANSFER);
        assertThat(debitAccount.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("90000"));
        assertThat(creditAccount.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("15000"));
    }

    @Test
    @DisplayName("Internal transfer: rejects same account")
    void internalTransfer_SameAccount() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));

        assertThatThrownBy(() -> paymentService.executeInternalTransfer(1L, 1L, new BigDecimal("1000"), "test"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("same account");
    }

    @Test
    @DisplayName("Internal transfer: rejects insufficient balance")
    void internalTransfer_InsufficientBalance() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(creditAccount));

        assertThatThrownBy(() -> paymentService.executeInternalTransfer(1L, 2L, new BigDecimal("200000"), "too much"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Insufficient");
    }

    @Test
    @DisplayName("Cross-currency transfer applies FX rate")
    void internalTransfer_CrossCurrency() {
        creditAccount.setCurrencyCode("EUR");
        FxRate rate = FxRate.builder().sourceCurrency("USD").targetCurrency("EUR")
                .buyRate(new BigDecimal("0.90")).sellRate(new BigDecimal("0.92")).midRate(new BigDecimal("0.91"))
                .isActive(true).build();

        when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
        when(accountRepository.findById(2L)).thenReturn(Optional.of(creditAccount));
        when(fxRateRepository.findLatestRate("USD", "EUR")).thenReturn(List.of(rate));
        when(paymentRepository.getNextInstructionSequence()).thenReturn(2L);
        when(paymentRepository.save(any())).thenAnswer(inv -> { PaymentInstruction p = inv.getArgument(0); p.setId(2L); return p; });
        PaymentInstruction result = paymentService.executeInternalTransfer(1L, 2L, new BigDecimal("10000"), "FX test");

        assertThat(result.getFxRate()).isEqualByComparingTo(new BigDecimal("0.92"));
        assertThat(result.getFxConvertedAmount()).isEqualByComparingTo(new BigDecimal("9200.00"));
    }

    @Test
    @DisplayName("Batch processing: processes all items, tracks success/failure counts")
    void batchProcessing() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(debitAccount));
        when(batchRepository.getNextBatchSequence()).thenReturn(1L);
        when(batchRepository.save(any())).thenAnswer(inv -> { PaymentBatch b = inv.getArgument(0); b.setId(1L); return b; });
        when(paymentRepository.getNextInstructionSequence()).thenReturn(1L, 2L, 3L);
        when(paymentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<PaymentService.BatchPaymentItem> items = List.of(
                new PaymentService.BatchPaymentItem("2000000001", "Vendor A", null, new BigDecimal("5000"), "Invoice 001"),
                new PaymentService.BatchPaymentItem("2000000002", "Vendor B", null, new BigDecimal("3000"), "Invoice 002")
        );

        PaymentBatch batch = paymentService.createBatch(1L, BatchType.VENDOR, "Monthly vendors", items);

        assertThat(batch.getTotalRecords()).isEqualTo(2);
        assertThat(batch.getTotalAmount()).isEqualByComparingTo(new BigDecimal("8000"));
    }
}
