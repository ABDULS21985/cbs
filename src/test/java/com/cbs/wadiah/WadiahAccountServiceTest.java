package com.cbs.wadiah;

import com.cbs.account.dto.TransactionResponse;
import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.account.service.AccountService;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.hijri.service.HijriCalendarService;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.productfactory.islamic.entity.IslamicContractType;
import com.cbs.productfactory.islamic.entity.IslamicDomainEnums;
import com.cbs.productfactory.islamic.entity.IslamicProductParameter;
import com.cbs.productfactory.islamic.entity.IslamicProductTemplate;
import com.cbs.productfactory.islamic.repository.IslamicProductParameterRepository;
import com.cbs.productfactory.islamic.repository.IslamicProductTemplateRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import com.cbs.wadiah.dto.OpenWadiahAccountRequest;
import com.cbs.wadiah.dto.WadiahDepositRequest;
import com.cbs.wadiah.entity.WadiahAccount;
import com.cbs.wadiah.entity.WadiahDomainEnums;
import com.cbs.wadiah.repository.WadiahAccountRepository;
import com.cbs.wadiah.service.WadiahAccountService;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WadiahAccountServiceTest {

    @Mock private WadiahAccountRepository wadiahAccountRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private ProductRepository productRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private IslamicProductTemplateRepository islamicProductTemplateRepository;
    @Mock private IslamicProductParameterRepository islamicProductParameterRepository;
    @Mock private AccountService accountService;
    @Mock private AccountPostingService accountPostingService;
    @Mock private TransactionJournalRepository transactionJournalRepository;
    @Mock private MudarabahAccountRepository mudarabahAccountRepository;
    @Mock private HijriCalendarService hijriCalendarService;
    @Mock private CurrentTenantResolver currentTenantResolver;

    @InjectMocks
    private WadiahAccountService wadiahAccountService;

    @Test
    void openWadiahAccount_rejectsPendingKyc() {
        Customer customer = customer();
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> wadiahAccountService.openWadiahAccount(openRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("KYC")
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("KYC_NOT_VERIFIED");
    }

    @Test
    void openWadiahAccount_rejectsProfitPromise() {
        Customer customer = customer();
        IslamicProductTemplate productTemplate = wadiahProductTemplate();
        IslamicProductParameter profitFlag = new IslamicProductParameter();
        profitFlag.setParameterValue("true");

        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        when(customerIdentificationRepository.findVerifiedByCustomerId(1L)).thenReturn(List.of(new com.cbs.customer.entity.CustomerIdentification()));
        when(islamicProductTemplateRepository.findByProductCodeIgnoreCase("WAD-CUR-SAR-001"))
                .thenReturn(Optional.of(productTemplate));
        when(islamicProductParameterRepository.findByProductTemplateIdAndParameterNameIgnoreCase(10L, "profitContractuallyPromised"))
                .thenReturn(Optional.of(profitFlag));

        assertThatThrownBy(() -> wadiahAccountService.openWadiahAccount(openRequest()))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo("SHARIAH_WAD_001");
    }

    @Test
    void deposit_usesWadiahCashGl() {
        Account account = depositAccount();
        WadiahAccount wadiahAccount = WadiahAccount.builder()
                .id(77L)
                .account(account)
                .wadiahType(WadiahDomainEnums.WadiahType.YAD_DHAMANAH)
                .contractReference("WAD-2026-000001")
                .lastActivityDate(LocalDate.now().minusDays(1))
                .build();
        TransactionJournal journal = TransactionJournal.builder()
                .id(10L)
                .transactionRef("TXN-1")
                .account(account)
                .transactionType(TransactionType.CREDIT)
                .amount(new BigDecimal("250.00"))
                .currencyCode("SAR")
                .runningBalance(new BigDecimal("1250.00"))
                .narration("Wadiah Deposit")
                .postingDate(LocalDate.now())
                .valueDate(LocalDate.now())
                .status("POSTED")
                .build();

        when(wadiahAccountRepository.findByAccountId(5L)).thenReturn(Optional.of(wadiahAccount));
        when(accountPostingService.postCreditAgainstGl(
                eq(account), eq(TransactionType.CREDIT), eq(new BigDecimal("250.00")),
                anyString(), any(), any(), eq("1100-000-001"), eq("WADIAH"), eq("WAD-2026-000001")
        )).thenReturn(journal);
        when(wadiahAccountRepository.save(any(WadiahAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TransactionResponse response = wadiahAccountService.deposit(5L, WadiahDepositRequest.builder()
                .amount(new BigDecimal("250.00"))
                .channel("BRANCH")
                .build());

        assertThat(response.getTransactionRef()).isEqualTo("TXN-1");
        ArgumentCaptor<WadiahAccount> captor = ArgumentCaptor.forClass(WadiahAccount.class);
        verify(wadiahAccountRepository).save(captor.capture());
        assertThat(captor.getValue().getLastActivityDate()).isEqualTo(LocalDate.now());
    }

    private OpenWadiahAccountRequest openRequest() {
        return OpenWadiahAccountRequest.builder()
                .customerId(1L)
                .productCode("WAD-CUR-SAR-001")
                .currencyCode("SAR")
                .openingBalance(new BigDecimal("1000.00"))
                .wadiahType(WadiahDomainEnums.WadiahType.YAD_DHAMANAH)
                .hibahDisclosureSigned(true)
                .build();
    }

    private Customer customer() {
        return Customer.builder()
                .id(1L)
                .customerType(CustomerType.INDIVIDUAL)
                .firstName("Amina")
                .lastName("Saleh")
                .build();
    }

    private IslamicProductTemplate wadiahProductTemplate() {
        return IslamicProductTemplate.builder()
                .id(10L)
                .productCode("WAD-CUR-SAR-001")
                .contractType(IslamicContractType.builder().id(2L).code("WADIAH").build())
                .status(IslamicDomainEnums.IslamicProductStatus.ACTIVE)
                .shariahComplianceStatus(IslamicDomainEnums.ShariahComplianceStatus.COMPLIANT)
                .profitCalculationMethod(IslamicDomainEnums.ProfitCalculationMethod.NONE)
                .fatwaRequired(true)
                .activeFatwaId(9L)
                .minAmount(new BigDecimal("1000.00"))
                .currencies(List.of("SAR"))
                .build();
    }

    private Account depositAccount() {
        Product product = Product.builder()
                .id(2L)
                .code("WAD-CUR-SAR-001")
                .name("Wadiah")
                .productCategory(ProductCategory.CURRENT)
                .currencyCode("SAR")
                .glAccountCode("2100-WAD-001")
                .build();
        Customer customer = customer();
        return Account.builder()
                .id(5L)
                .accountNumber("00012345")
                .accountName("Amina Saleh")
                .customer(customer)
                .product(product)
                .currencyCode("SAR")
                .accountType(AccountType.INDIVIDUAL)
                .status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("1000.00"))
                .availableBalance(new BigDecimal("1000.00"))
                .build();
    }
}
