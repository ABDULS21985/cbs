package com.cbs.qard;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.qard.dto.CreateQardLoanRequest;
import com.cbs.qard.dto.QardHasanAccountResponse;
import com.cbs.qard.entity.QardDomainEnums;
import com.cbs.qard.entity.QardHasanAccount;
import com.cbs.qard.entity.QardRepaymentSchedule;
import com.cbs.qard.repository.QardHasanAccountRepository;
import com.cbs.qard.repository.QardRepaymentScheduleRepository;
import com.cbs.qard.service.QardHasanService;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QardHasanServiceTest {

    @Mock private QardHasanAccountRepository qardHasanAccountRepository;
    @Mock private QardRepaymentScheduleRepository qardRepaymentScheduleRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private ProductRepository productRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private IslamicProductParameterRepository islamicProductParameterRepository;
    @Mock private AccountService accountService;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CurrentTenantResolver currentTenantResolver;

    @InjectMocks
    private QardHasanService qardHasanService;

    @Test
    void createQardLoan_generatesPrincipalOnlySchedule() {
        Customer customer = customer();
        Product loanProduct = Product.builder()
                .id(15L)
                .code("QRD-LOAN-SAR-001")
                .name("Qard Hasan Loan")
                .productCategory(ProductCategory.PERSONAL_LOAN)
                .currencyCode("SAR")
                .glAccountCode("1200-QRD-001")
                .build();
        Account settlementAccount = Account.builder()
                .id(40L)
                .accountNumber("SETTLE-1")
                .accountName("Settlement")
                .customer(customer)
                .product(Product.builder().glAccountCode("2100-WAD-001").build())
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(new BigDecimal("100000.00"))
                .build();
        Account qardBaseAccount = Account.builder()
                .id(50L)
                .accountNumber("QRD-ACCT-1")
                .accountName("Qard Loan")
                .customer(customer)
                .product(loanProduct)
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(BigDecimal.ZERO)
                .availableBalance(BigDecimal.ZERO)
                .build();
        AtomicReference<QardHasanAccount> savedRef = new AtomicReference<>();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("QRD-LOAN-SAR-001"))
                .thenReturn(Optional.of(qardLoanTemplate()));
        when(productRepository.findByCode("QRD-LOAN-SAR-001")).thenReturn(Optional.of(loanProduct));
        when(accountRepository.findById(40L)).thenReturn(Optional.of(settlementAccount));
        when(accountService.openAccount(any())).thenReturn(AccountResponse.builder().id(50L).build());
        when(accountRepository.findById(50L)).thenReturn(Optional.of(qardBaseAccount));
        when(qardHasanAccountRepository.save(any(QardHasanAccount.class))).thenAnswer(invocation -> {
            QardHasanAccount account = invocation.getArgument(0);
            if (account.getId() == null) {
                account.setId(60L);
            }
            savedRef.set(account);
            return account;
        });
        when(qardHasanAccountRepository.findById(60L)).thenAnswer(invocation -> Optional.of(savedRef.get()));
        when(accountPostingService.balanceLeg(anyString(), any(), any(), anyString(), any(), anyString(), any(), any()))
                .thenReturn(new AccountPostingService.GlPostingLeg(
                        "1200-QRD-001", AccountPostingService.EntrySide.DEBIT, new BigDecimal("1200.00"),
                        "SAR", BigDecimal.ONE, "Qard Hasan receivable", 50L, 1L, "HEAD"
                ));
        when(accountPostingService.postCreditAgainstGl(any(), any(), any(), anyString(), any(), anyString(), anyList(), anyString(), anyString()))
                .thenReturn(TransactionJournal.builder()
                        .id(90L)
                        .transactionRef("TXN-QARD-DISB")
                        .account(settlementAccount)
                        .transactionType(TransactionType.CREDIT)
                        .amount(new BigDecimal("1200.00"))
                        .currencyCode("SAR")
                        .runningBalance(new BigDecimal("1200.00"))
                        .narration("Qard Hasan loan disbursement")
                        .postingDate(LocalDate.now())
                        .valueDate(LocalDate.now())
                        .status("POSTED")
                        .build());

        QardHasanAccountResponse response = qardHasanService.createQardLoan(CreateQardLoanRequest.builder()
                .customerId(1L)
                .productCode("QRD-LOAN-SAR-001")
                .currencyCode("SAR")
                .principalAmount(new BigDecimal("1200.00"))
                .settlementAccountId(40L)
                .repaymentFrequency(QardDomainEnums.RepaymentFrequency.MONTHLY)
                .totalInstallments(3)
                .purpose(QardDomainEnums.Purpose.MEDICAL)
                .build());

        ArgumentCaptor<List<QardRepaymentSchedule>> scheduleCaptor = ArgumentCaptor.forClass(List.class);
        verify(qardRepaymentScheduleRepository).saveAll(scheduleCaptor.capture());
        List<QardRepaymentSchedule> schedules = scheduleCaptor.getValue();

        assertThat(response.getOutstandingPrincipal()).isEqualByComparingTo("1200.00");
        assertThat(schedules).hasSize(3);
        assertThat(schedules).allMatch(item -> item.getStatus() == QardDomainEnums.ScheduleStatus.PENDING);
        assertThat(schedules.stream().map(QardRepaymentSchedule::getPrincipalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("1200.00");
    }

    @Test
    void createQardLoan_rejectsUnjustifiedAdminFee() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("QRD-LOAN-SAR-001"))
                .thenReturn(Optional.of(qardLoanTemplate()));
        when(productRepository.findByCode("QRD-LOAN-SAR-001"))
                .thenReturn(Optional.of(Product.builder().code("QRD-LOAN-SAR-001").build()));
        when(accountRepository.findById(40L)).thenReturn(Optional.of(Account.builder()
                .id(40L)
                .customer(customer())
                .currencyCode("SAR")
                .build()));

        assertThatThrownBy(() -> qardHasanService.createQardLoan(CreateQardLoanRequest.builder()
                .customerId(1L)
                .productCode("QRD-LOAN-SAR-001")
                .currencyCode("SAR")
                .principalAmount(new BigDecimal("1000.00"))
                .settlementAccountId(40L)
                .adminFeeAmount(new BigDecimal("25.00"))
                .build()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("ADMIN_FEE_JUSTIFICATION_REQUIRED");
    }

    private Customer customer() {
        return Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .firstName("Yusuf")
                .lastName("Khalid")
                .build();
    }

    private IslamicProductTemplate qardLoanTemplate() {
        return IslamicProductTemplate.builder()
                .id(15L)
                .productCode("QRD-LOAN-SAR-001")
                .contractType(IslamicContractType.builder().id(3L).code("QARD").build())
                .status(IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .profitCalculationMethod(IslamicDomainEnums.ProfitCalculationMethod.NONE)
                .fatwaRequired(true)
                .activeFatwaId(8L)
                .currencies(List.of("SAR"))
                .build();
    }
}
