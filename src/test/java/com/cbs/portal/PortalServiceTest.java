package com.cbs.portal;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.AccountStatus;
import com.cbs.account.entity.AccountType;
import com.cbs.account.entity.Product;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.dto.AccountResponse;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.AccountSignatoryRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.portal.dto.PortalDashboardResponse;
import com.cbs.portal.dto.ProfileUpdateRequestDto;
import com.cbs.portal.entity.ProfileUpdateRequest;
import com.cbs.portal.repository.ProfileUpdateRequestRepository;
import com.cbs.portal.service.PortalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortalServiceTest {

    @Mock private CustomerRepository customerRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private TransactionJournalRepository transactionRepository;
    @Mock private AccountSignatoryRepository signatoryRepository;
    @Mock private ProfileUpdateRequestRepository profileUpdateRepository;
    @Mock private CustomerMapper customerMapper;
    @Mock private AccountMapper accountMapper;

    @InjectMocks
    private PortalService portalService;

    private Customer testCustomer;
    private Account testAccount;

    @BeforeEach
    void setUp() {
        testCustomer = Customer.builder()
                .id(1L).cifNumber("CIF0000100000")
                .customerType(CustomerType.INDIVIDUAL).status(CustomerStatus.ACTIVE)
                .firstName("Amina").lastName("Bakare")
                .build();

        Product product = Product.builder()
                .id(1L).code("SA-NGN-STD").name("Savings").build();

        testAccount = Account.builder()
                .id(1L).accountNumber("1000000001").accountName("Amina Bakare")
                .customer(testCustomer).product(product).currencyCode("NGN")
                .accountType(AccountType.INDIVIDUAL).status(AccountStatus.ACTIVE)
                .bookBalance(new BigDecimal("150000")).availableBalance(new BigDecimal("150000"))
                .build();
    }

    @Test
    @DisplayName("Should return portal dashboard with account summaries")
    void getDashboard_Success() {
        when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
        when(accountRepository.findByCustomerIdAndStatus(1L, AccountStatus.ACTIVE))
                .thenReturn(List.of(testAccount));
        when(signatoryRepository.findByAccountIdWithCustomer(1L)).thenReturn(List.of());
        when(transactionRepository.findByAccountIdOrderByCreatedAtDesc(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(profileUpdateRepository.findByCustomerIdAndStatus(1L, "PENDING"))
                .thenReturn(List.of());

        AccountResponse mockResp = AccountResponse.builder()
                .id(1L).accountNumber("1000000001")
                .bookBalance(new BigDecimal("150000")).build();
        when(accountMapper.toResponse(testAccount)).thenReturn(mockResp);
        when(accountMapper.toSignatoryDtoList(any())).thenReturn(List.of());

        PortalDashboardResponse dashboard = portalService.getDashboard(1L);

        assertThat(dashboard.getTotalAccounts()).isEqualTo(1);
        assertThat(dashboard.getTotalBookBalance()).isEqualByComparingTo(new BigDecimal("150000"));
        assertThat(dashboard.getCifNumber()).isEqualTo("CIF0000100000");
    }

    @Test
    @DisplayName("Should submit profile update request")
    void submitProfileUpdate_Success() {
        ProfileUpdateRequestDto request = ProfileUpdateRequestDto.builder()
                .requestType("EMAIL_CHANGE")
                .oldValue("old@example.com")
                .newValue("new@example.com")
                .channel("WEB")
                .build();

        ProfileUpdateRequest saved = ProfileUpdateRequest.builder()
                .id(1L).customerId(1L).requestType("EMAIL_CHANGE")
                .oldValue("old@example.com").newValue("new@example.com")
                .status("PENDING").channel("WEB").submittedAt(Instant.now())
                .build();

        when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
        when(profileUpdateRepository.save(any())).thenReturn(saved);

        ProfileUpdateRequestDto result = portalService.submitProfileUpdate(1L, request);

        assertThat(result.getStatus()).isEqualTo("PENDING");
        assertThat(result.getRequestType()).isEqualTo("EMAIL_CHANGE");
    }

    @Test
    @DisplayName("Should approve profile update and apply email change")
    void approveProfileUpdate_AppliesChange() {
        ProfileUpdateRequest pending = ProfileUpdateRequest.builder()
                .id(1L).customerId(1L).requestType("EMAIL_CHANGE")
                .oldValue("old@example.com").newValue("new@example.com")
                .status("PENDING").build();

        when(profileUpdateRepository.findById(1L)).thenReturn(Optional.of(pending));
        when(profileUpdateRepository.save(any())).thenReturn(pending);
        when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
        when(customerRepository.save(any())).thenReturn(testCustomer);

        ProfileUpdateRequestDto result = portalService.approveProfileUpdate(1L, "admin1");

        assertThat(result.getStatus()).isEqualTo("APPROVED");
        assertThat(testCustomer.getEmail()).isEqualTo("new@example.com");
    }

    @Test
    @DisplayName("Should reject profile update with reason")
    void rejectProfileUpdate_Success() {
        ProfileUpdateRequest pending = ProfileUpdateRequest.builder()
                .id(2L).customerId(1L).requestType("PHONE_CHANGE")
                .status("PENDING").build();

        when(profileUpdateRepository.findById(2L)).thenReturn(Optional.of(pending));
        when(profileUpdateRepository.save(any())).thenReturn(pending);

        ProfileUpdateRequestDto result = portalService.rejectProfileUpdate(2L, "admin1", "Invalid phone format");

        assertThat(result.getStatus()).isEqualTo("REJECTED");
        assertThat(result.getRejectionReason()).isEqualTo("Invalid phone format");
    }

    @Test
    @DisplayName("Should deny account access for non-owner non-signatory")
    void getBalance_AccessDenied() {
        Account otherAccount = Account.builder()
                .id(99L).accountNumber("9999999999")
                .customer(Customer.builder().id(50L).build())
                .product(testAccount.getProduct())
                .build();

        when(accountRepository.findByAccountNumberWithDetails("9999999999"))
                .thenReturn(Optional.of(otherAccount));
        when(signatoryRepository.existsByAccountIdAndCustomerId(99L, 1L)).thenReturn(false);

        assertThatThrownBy(() -> portalService.getAccountBalance(1L, "9999999999"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("does not belong");
    }
}
