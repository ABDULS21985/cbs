package com.cbs.payments.remittance;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.Product;
import com.cbs.account.entity.TransactionJournal;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.payments.entity.FxRate;
import com.cbs.payments.orchestration.PaymentOrchestrationService;
import com.cbs.payments.repository.FxRateRepository;
import com.cbs.account.repository.AccountRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RemittanceServiceTest {

    @Mock private RemittanceCorridorRepository corridorRepository;
    @Mock private RemittanceBeneficiaryRepository beneficiaryRepository;
    @Mock private RemittanceTransactionRepository txnRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private FxRateRepository fxRateRepository;
    @Mock private PaymentOrchestrationService orchestrationService;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;

    @InjectMocks private RemittanceService remittanceService;

    private RemittanceCorridor corridor;
    private RemittanceBeneficiary beneficiary;
    private Account senderAccount;

    @BeforeEach
    void setUp() {
        corridor = RemittanceCorridor.builder()
                .id(7L)
                .corridorCode("NG-US")
                .sourceCountry("NGA")
                .destinationCountry("USA")
                .sourceCurrency("USD")
                .destinationCurrency("USD")
                .flatFee(new BigDecimal("10.00"))
                .percentageFee(BigDecimal.ZERO)
                .fxMarkupPct(BigDecimal.ZERO)
                .minAmount(BigDecimal.ONE)
                .isActive(true)
                .build();
        beneficiary = RemittanceBeneficiary.builder()
                .id(3L)
                .customerId(1L)
                .beneficiaryName("Receiver")
                .beneficiaryCountry("USA")
                .build();
        senderAccount = Account.builder()
                .id(8L)
                .accountNumber("1000000001")
                .currencyCode("USD")
                .availableBalance(new BigDecimal("1000.00"))
                .bookBalance(new BigDecimal("1000.00"))
                .customer(Customer.builder().id(1L).customerType(CustomerType.INDIVIDUAL).build())
                .product(Product.builder().id(5L).code("CA-USD").glAccountCode("2001").glFeeIncomeCode("4001").build())
                .build();

        CbsProperties.LedgerConfig ledgerConfig = new CbsProperties.LedgerConfig();
        ledgerConfig.setRemittanceSettlementGlCode("2101");
        when(cbsProperties.getLedger()).thenReturn(ledgerConfig);
    }

    @Test
    @DisplayName("sendRemittance debits the source account through the posting engine with principal and fee legs")
    void sendRemittance_UsesPostingEngine() {
        when(beneficiaryRepository.findById(3L)).thenReturn(Optional.of(beneficiary));
        when(corridorRepository.findBySourceCountryAndDestinationCountryAndIsActiveTrue("NGA", "USA"))
                .thenReturn(Optional.of(corridor));
        when(fxRateRepository.findLatestRate("USD", "USD"))
                .thenReturn(List.of(FxRate.builder()
                        .sourceCurrency("USD")
                        .targetCurrency("USD")
                        .buyRate(BigDecimal.ONE)
                        .sellRate(BigDecimal.ONE)
                        .midRate(BigDecimal.ONE)
                        .build()));
        when(txnRepository.getNextRemittanceSequence()).thenReturn(1L);
        when(accountRepository.findById(8L)).thenReturn(Optional.of(senderAccount));
        when(accountPostingService.postDebitAgainstGl(any(Account.class), any(), any(BigDecimal.class),
                anyString(), any(), anyString(), anyList(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder().id(20L).build());
        when(orchestrationService.routePayment(anyString(), anyString(), anyString(), anyString(), any(BigDecimal.class), anyString()))
                .thenReturn(new PaymentOrchestrationService.RoutingDecision("SWIFT", "Swift", "T_PLUS_2",
                        new BigDecimal("5.00"), false, "rule", 1));
        when(txnRepository.save(any(RemittanceTransaction.class))).thenAnswer(invocation -> {
            RemittanceTransaction txn = invocation.getArgument(0);
            txn.setId(30L);
            return txn;
        });

        RemittanceTransaction result = remittanceService.sendRemittance(
                1L, 8L, 3L, "NGA", "USA", new BigDecimal("100.00"),
                null, null, null);

        assertThat(result.getRemittanceRef()).isEqualTo("RMT000000000001");
        assertThat(result.getTotalDebitAmount()).isEqualByComparingTo(new BigDecimal("110.00"));
        verify(accountPostingService).postDebitAgainstGl(any(Account.class), any(), argThat(amount ->
                        amount.compareTo(new BigDecimal("110.00")) == 0),
                anyString(), any(), anyString(),
                argThat(legs -> legs.size() == 2
                        && legs.get(0).glCode().equals("2101")
                        && legs.get(0).amount().compareTo(new BigDecimal("100.00")) == 0
                        && legs.get(1).glCode().equals("4001")
                        && legs.get(1).amount().compareTo(new BigDecimal("10.00")) == 0),
                anyString(), anyString());
    }
}
