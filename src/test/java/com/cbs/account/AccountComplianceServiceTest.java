package com.cbs.account;

import com.cbs.account.dto.AccountComplianceCheckRequest;
import com.cbs.account.dto.AccountComplianceCheckResponse;
import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.Product;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.ProductRepository;
import com.cbs.account.service.AccountComplianceService;
import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import com.cbs.aml.repository.AmlAlertRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.repository.CustomerIdentificationRepository;
import com.cbs.customer.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountComplianceServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private CustomerIdentificationRepository customerIdentificationRepository;
    @Mock private ProductRepository productRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AmlAlertRepository amlAlertRepository;

    private AccountComplianceService accountComplianceService;

    @BeforeEach
    void setUp() {
        accountComplianceService = new AccountComplianceService(
                customerRepository,
                customerIdentificationRepository,
                productRepository,
                accountRepository,
                amlAlertRepository
        );
    }

    @Test
    @DisplayName("check flags blocking AML alerts, duplicate accounts, and dormant accounts")
    void check_FlagsBlockingConditions() {
        Customer customer = Customer.builder().id(10L).build();
        Product product = Product.builder().id(20L).code("SAV-STD").build();
        Account duplicateAccount = Account.builder()
                .id(30L)
                .product(product)
                .status(AccountStatus.ACTIVE)
                .accountNumber("0001112223")
                .build();
        Account dormantAccount = Account.builder()
                .id(31L)
                .product(product)
                .status(AccountStatus.DORMANT)
                .accountNumber("0001112224")
                .build();
        AmlAlert alert = AmlAlert.builder().status(AmlAlertStatus.UNDER_REVIEW).build();

        when(customerRepository.findById(10L)).thenReturn(Optional.of(customer));
        when(productRepository.findByCode("SAV-STD")).thenReturn(Optional.of(product));
        when(customerIdentificationRepository.findVerifiedByCustomerId(10L)).thenReturn(List.of());
        when(accountRepository.findByCustomerId(10L)).thenReturn(List.of(duplicateAccount, dormantAccount));
        when(amlAlertRepository.findByCustomerIdOrderByCreatedAtDesc(any(Long.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alert)));

        AccountComplianceCheckResponse response = accountComplianceService.check(
                AccountComplianceCheckRequest.builder()
                        .customerId(10L)
                        .productCode("SAV-STD")
                        .build()
        );

        assertThat(response.isKycVerified()).isFalse();
        assertThat(response.getKycLevel()).isEqualTo("PENDING");
        assertThat(response.isAmlClear()).isFalse();
        assertThat(response.isDuplicateFound()).isTrue();
        assertThat(response.isDormantAccountExists()).isTrue();
        assertThat(response.getDormantAccountId()).isEqualTo("0001112224");
    }
}
