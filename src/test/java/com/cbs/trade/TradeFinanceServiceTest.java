package com.cbs.trade;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.trade.entity.*;
import com.cbs.trade.repository.*;
import com.cbs.trade.service.TradeFinanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TradeFinanceServiceTest {

    @Mock private LetterOfCreditRepository lcRepository;
    @Mock private BankGuaranteeRepository bgRepository;
    @Mock private DocumentaryCollectionRepository dcRepository;
    @Mock private SupplyChainProgrammeRepository scfRepository;
    @Mock private ScfInvoiceRepository invoiceRepository;
    @Mock private TradeDocumentRepository tradeDocRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private AccountRepository accountRepository;

    @InjectMocks private TradeFinanceService tradeService;

    private Customer customer;
    private Account marginAccount;

    @BeforeEach
    void setUp() {
        customer = Customer.builder().id(1L).firstName("Trade").lastName("Corp")
                .customerType(CustomerType.CORPORATE).build();
        marginAccount = Account.builder().id(10L).accountNumber("1000000010")
                .customer(customer).currencyCode("USD")
                .bookBalance(new BigDecimal("1000000")).availableBalance(new BigDecimal("1000000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-CORP").build()).build();
    }

    @Test
    @DisplayName("Should issue LC with margin lien and commission debit")
    void issueLC_Success() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(marginAccount));
        when(lcRepository.getNextLcSequence()).thenReturn(1L);
        when(lcRepository.save(any())).thenAnswer(inv -> { LetterOfCredit lc = inv.getArgument(0); lc.setId(1L); return lc; });
        when(accountRepository.save(any())).thenReturn(marginAccount);

        LetterOfCredit result = tradeService.issueLC(1L, LcType.IMPORT_LC, "Supplier Co",
                new BigDecimal("500000"), "USD", LocalDate.now().plusMonths(6),
                "Electronic components", List.of("Invoice", "Bill of Lading", "Packing List"),
                "SIGHT", null, 10L, new BigDecimal("100"), new BigDecimal("0.125"));

        assertThat(result.getStatus()).isEqualTo(LcStatus.ISSUED);
        assertThat(result.getLcNumber()).startsWith("LC");
        assertThat(result.getMarginAmount()).isEqualByComparingTo(new BigDecimal("500000.00"));
        assertThat(result.getCommissionAmount()).isEqualByComparingTo(new BigDecimal("625.00"));
        // Margin lien placed
        assertThat(marginAccount.getLienAmount()).isEqualByComparingTo(new BigDecimal("500000.00"));
    }

    @Test
    @DisplayName("Should settle LC presentation and reduce available amount")
    void settleLCPresentation() {
        LetterOfCredit lc = LetterOfCredit.builder()
                .id(1L).lcNumber("LC000000000001").lcType(LcType.IMPORT_LC)
                .applicant(customer).amount(new BigDecimal("500000")).currencyCode("USD")
                .utilizedAmount(BigDecimal.ZERO).marginAccount(marginAccount)
                .marginPercentage(new BigDecimal("100")).marginAmount(new BigDecimal("500000"))
                .status(LcStatus.ISSUED).build();

        marginAccount.setLienAmount(new BigDecimal("500000"));

        when(lcRepository.findById(1L)).thenReturn(Optional.of(lc));
        when(accountRepository.save(any())).thenReturn(marginAccount);
        when(lcRepository.save(any())).thenReturn(lc);

        LetterOfCredit result = tradeService.settlePresentation(1L, new BigDecimal("200000"));

        assertThat(result.getUtilizedAmount()).isEqualByComparingTo(new BigDecimal("200000"));
        assertThat(result.getStatus()).isEqualTo(LcStatus.PARTIALLY_UTILIZED);
        assertThat(result.availableAmount()).isEqualByComparingTo(new BigDecimal("300000"));
    }

    @Test
    @DisplayName("Should reject LC settlement exceeding available amount")
    void settleLCPresentation_ExceedsAvailable() {
        LetterOfCredit lc = LetterOfCredit.builder()
                .id(2L).amount(new BigDecimal("100000")).utilizedAmount(new BigDecimal("80000"))
                .status(LcStatus.PARTIALLY_UTILIZED).build();

        when(lcRepository.findById(2L)).thenReturn(Optional.of(lc));

        assertThatThrownBy(() -> tradeService.settlePresentation(2L, new BigDecimal("30000")))
                .isInstanceOf(BusinessException.class).hasMessageContaining("exceeds");
    }

    @Test
    @DisplayName("Should issue guarantee and place margin lien")
    void issueGuarantee_Success() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(accountRepository.findById(10L)).thenReturn(Optional.of(marginAccount));
        when(bgRepository.getNextBgSequence()).thenReturn(1L);
        when(bgRepository.save(any())).thenAnswer(inv -> { BankGuarantee bg = inv.getArgument(0); bg.setId(1L); return bg; });
        when(accountRepository.save(any())).thenReturn(marginAccount);

        BankGuarantee result = tradeService.issueGuarantee(1L, GuaranteeType.PERFORMANCE,
                "Project Owner", new BigDecimal("250000"), "USD",
                LocalDate.now().plusYears(1), "Construction project performance",
                true, 365, 10L, new BigDecimal("50"), new BigDecimal("0.50"));

        assertThat(result.getStatus()).isEqualTo(GuaranteeStatus.ISSUED);
        assertThat(result.getMarginAmount()).isEqualByComparingTo(new BigDecimal("125000.00"));
        assertThat(result.getCommissionAmount()).isEqualByComparingTo(new BigDecimal("1250.00"));
    }

    @Test
    @DisplayName("Should process guarantee claim and update status")
    void processGuaranteeClaim() {
        BankGuarantee bg = BankGuarantee.builder()
                .id(1L).guaranteeNumber("BG000000000001")
                .amount(new BigDecimal("250000")).claimedAmount(BigDecimal.ZERO)
                .marginAccount(marginAccount).marginAmount(new BigDecimal("125000"))
                .status(GuaranteeStatus.ISSUED).build();
        marginAccount.setLienAmount(new BigDecimal("125000"));

        when(bgRepository.findById(1L)).thenReturn(Optional.of(bg));
        when(accountRepository.save(any())).thenReturn(marginAccount);
        when(bgRepository.save(any())).thenReturn(bg);

        BankGuarantee result = tradeService.processGuaranteeClaim(1L, new BigDecimal("100000"));

        assertThat(result.getClaimedAmount()).isEqualByComparingTo(new BigDecimal("100000"));
        assertThat(result.getStatus()).isEqualTo(GuaranteeStatus.PARTIALLY_CLAIMED);
    }

    @Test
    @DisplayName("Should finance SCF invoice with discount calculation")
    void financeInvoice_Success() {
        SupplyChainProgramme programme = SupplyChainProgramme.builder()
                .id(1L).programmeCode("SCF00000001").programmeType(ScfProgrammeType.APPROVED_PAYABLES)
                .programmeLimit(new BigDecimal("5000000")).utilizedAmount(BigDecimal.ZERO)
                .availableAmount(new BigDecimal("5000000")).currencyCode("USD")
                .discountRate(new BigDecimal("8.00")).status("ACTIVE").build();

        when(scfRepository.findById(1L)).thenReturn(Optional.of(programme));
        when(scfRepository.save(any())).thenReturn(programme);
        when(invoiceRepository.save(any())).thenAnswer(inv -> { ScfInvoice i = inv.getArgument(0); i.setId(1L); return i; });

        ScfInvoice result = tradeService.financeInvoice(1L, "INV-2026-001", null, null,
                new BigDecimal("100000"), "USD", LocalDate.now(), LocalDate.now().plusDays(90));

        assertThat(result.getStatus()).isEqualTo("FINANCED");
        assertThat(result.getFinancedAmount()).isEqualByComparingTo(new BigDecimal("100000"));
        // Discount: 100000 * 8% * 90/365 ≈ 1972.60
        assertThat(result.getDiscountAmount()).isBetween(new BigDecimal("1900"), new BigDecimal("2100"));
        assertThat(result.getNetPayment()).isLessThan(result.getFinancedAmount());
    }
}
