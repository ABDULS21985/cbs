package com.cbs.unit.customer;

import com.cbs.account.dto.AccountResponse;
import com.cbs.account.dto.OpenAccountRequest;
import com.cbs.account.entity.*;
import com.cbs.account.mapper.AccountMapper;
import com.cbs.account.repository.*;
import com.cbs.account.service.AccountService;
import com.cbs.account.validation.AccountValidator;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.*;
import com.cbs.customer.entity.RelationshipType;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.*;
import com.cbs.customer.service.CustomerService;
import com.cbs.customer.validation.CustomerValidator;
import com.cbs.provider.interest.DayCountEngine;
import com.cbs.provider.kyc.KycProvider;
import com.cbs.provider.numbering.AccountNumberGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
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
class CustomerAccountServiceTest {

    // ========================================================================
    // CustomerService tests
    // ========================================================================

    @Nested
    @DisplayName("CustomerService Tests")
    @ExtendWith(MockitoExtension.class)
    class CustomerServiceTests {

        @Mock private CustomerRepository customerRepository;
        @Mock private CustomerAddressRepository addressRepository;
        @Mock private CustomerIdentificationRepository identificationRepository;
        @Mock private CustomerRelationshipRepository relationshipRepository;
        @Mock private CustomerNoteRepository noteRepository;
        @Mock private CustomerMapper customerMapper;
        @Mock private CustomerValidator customerValidator;
        @Mock private KycProvider kycProvider;
        @Mock private AccountNumberGenerator numberGenerator;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private CustomerService customerService;

        private Customer customer;
        private CreateCustomerRequest createRequest;
        private CustomerResponse customerResponse;

        @BeforeEach
        void setUp() {
            customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setCustomerType(CustomerType.INDIVIDUAL);
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setRiskRating(RiskRating.MEDIUM);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            createRequest = CreateCustomerRequest.builder()
                    .customerType(CustomerType.INDIVIDUAL)
                    .firstName("John")
                    .lastName("Doe")
                    .email("john.doe@example.com")
                    .phonePrimary("+2348012345678")
                    .build();

            customerResponse = CustomerResponse.builder()
                    .id(1L)
                    .cifNumber("CIF0000000001")
                    .customerType(CustomerType.INDIVIDUAL)
                    .status(CustomerStatus.ACTIVE)
                    .riskRating(RiskRating.MEDIUM)
                    .firstName("John")
                    .lastName("Doe")
                    .build();
        }

        @Test
        @DisplayName("createCustomer generates unique CIF number and sets ACTIVE status")
        void createCustomer_generatesUniqueCifAndSetsActiveStatus() {
            CbsProperties.Deployment deployment = new CbsProperties.Deployment();
            deployment.setCountryCode("NGA");

            when(customerRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
            when(customerRepository.existsByPhonePrimary("+2348012345678")).thenReturn(false);
            when(customerMapper.toEntity(createRequest)).thenReturn(customer);
            when(customerRepository.getNextCifSequence()).thenReturn(1L);
            when(numberGenerator.generateCif(1L)).thenReturn("CIF0000000001");
            when(cbsProperties.getDeployment()).thenReturn(deployment);
            when(customerRepository.save(any(Customer.class))).thenReturn(customer);
            when(customerMapper.toResponse(customer)).thenReturn(customerResponse);

            CustomerResponse result = customerService.createCustomer(createRequest);

            assertThat(result.getCifNumber()).isEqualTo("CIF0000000001");
            assertThat(result.getStatus()).isEqualTo(CustomerStatus.ACTIVE);
            verify(numberGenerator).generateCif(1L);
            verify(customerRepository).save(any(Customer.class));
        }

        @Test
        @DisplayName("createCustomer rejects duplicate email")
        void createCustomer_rejectsDuplicateEmail() {
            when(customerRepository.existsByEmail("john.doe@example.com")).thenReturn(true);

            assertThatThrownBy(() -> customerService.createCustomer(createRequest))
                    .isInstanceOf(DuplicateResourceException.class);

            verify(customerRepository, never()).save(any());
        }

        @Test
        @DisplayName("createCustomer rejects duplicate phone number")
        void createCustomer_rejectsDuplicatePhone() {
            when(customerRepository.existsByEmail("john.doe@example.com")).thenReturn(false);
            when(customerRepository.existsByPhonePrimary("+2348012345678")).thenReturn(true);

            assertThatThrownBy(() -> customerService.createCustomer(createRequest))
                    .isInstanceOf(DuplicateResourceException.class);

            verify(customerRepository, never()).save(any());
        }

        @Test
        @DisplayName("changeStatus validates transition and creates audit note")
        void changeStatus_validatesTransitionAndCreatesNote() {
            CustomerStatusChangeRequest statusRequest = CustomerStatusChangeRequest.builder()
                    .newStatus(CustomerStatus.SUSPENDED)
                    .reason("Suspicious activity detected")
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(customerRepository.save(any(Customer.class))).thenReturn(customer);
            when(noteRepository.save(any(CustomerNote.class))).thenAnswer(inv -> inv.getArgument(0));
            when(customerMapper.toResponse(customer)).thenReturn(customerResponse);

            CustomerResponse result = customerService.changeStatus(1L, statusRequest);

            verify(customerValidator).validateStatusTransition(CustomerStatus.ACTIVE, CustomerStatus.SUSPENDED);
            verify(noteRepository).save(any(CustomerNote.class));
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("changeStatus throws ResourceNotFoundException for unknown customer")
        void changeStatus_throwsForUnknownCustomer() {
            CustomerStatusChangeRequest statusRequest = CustomerStatusChangeRequest.builder()
                    .newStatus(CustomerStatus.DORMANT)
                    .reason("Inactivity")
                    .build();

            when(customerRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> customerService.changeStatus(999L, statusRequest))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("addRelationship prevents self-relationship")
        void addRelationship_preventsSelfRelationship() {
            RelationshipDto dto = new RelationshipDto();
            dto.setRelatedCustomerId(1L);
            dto.setRelationshipType(RelationshipType.SPOUSE);

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

            assertThatThrownBy(() -> customerService.addRelationship(1L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("themselves");
        }
    }

    // ========================================================================
    // AccountService tests
    // ========================================================================

    @Nested
    @DisplayName("AccountService Tests")
    @ExtendWith(MockitoExtension.class)
    class AccountServiceTests {

        @Mock private AccountRepository accountRepository;
        @Mock private ProductRepository productRepository;
        @Mock private InterestTierRepository interestTierRepository;
        @Mock private AccountSignatoryRepository signatoryRepository;
        @Mock private TransactionJournalRepository transactionRepository;
        @Mock private CustomerRepository customerRepository;
        @Mock private AccountMapper accountMapper;
        @Mock private AccountValidator accountValidator;
        @Mock private AccountNumberGenerator numberGenerator;
        @Mock private DayCountEngine dayCountEngine;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private AccountService accountService;

        private Customer customer;
        private Product product;
        private Account account;

        @BeforeEach
        void setUp() {
            customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            product = new Product();
            product.setId(1L);
            product.setCode("SAV-001");
            product.setName("Basic Savings");
            product.setCurrencyCode("USD");
            product.setIsActive(true);
            product.setInterestBearing(false);

            account = new Account();
            account.setId(1L);
            account.setAccountNumber("1000000001");
            account.setAccountName("John Doe");
            account.setCustomer(customer);
            account.setProduct(product);
            account.setCurrencyCode("USD");
            account.setStatus(AccountStatus.ACTIVE);
            account.setBookBalance(BigDecimal.ZERO);
            account.setAvailableBalance(BigDecimal.ZERO);
            account.setAccruedInterest(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("openAccount sets ACTIVE status and generates account number")
        void openAccount_setsActiveStatusAndGeneratesNumber() {
            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L)
                    .productCode("SAV-001")
                    .accountType(AccountType.INDIVIDUAL)
                    .build();

            CbsProperties.AccountConfig accountConfig = new CbsProperties.AccountConfig();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(productRepository.findByCode("SAV-001")).thenReturn(Optional.of(product));
            when(accountRepository.getNextAccountNumberSequence()).thenReturn(1L);
            when(numberGenerator.generate(1L)).thenReturn("1000000001");
            when(accountRepository.save(any(Account.class))).thenReturn(account);
            when(signatoryRepository.findByAccountIdWithCustomer(anyLong())).thenReturn(List.of());
            when(accountMapper.toResponse(any(Account.class))).thenReturn(new AccountResponse());
            when(cbsProperties.getAccount()).thenReturn(accountConfig);

            AccountResponse result = accountService.openAccount(request);

            assertThat(result).isNotNull();
            verify(numberGenerator).generate(1L);
            verify(accountRepository).save(any(Account.class));
        }

        @Test
        @DisplayName("openAccount rejects non-active customer")
        void openAccount_rejectsNonActiveCustomer() {
            customer.setStatus(CustomerStatus.SUSPENDED);
            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L)
                    .productCode("SAV-001")
                    .accountType(AccountType.INDIVIDUAL)
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

            assertThatThrownBy(() -> accountService.openAccount(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("non-active");
        }

        @Test
        @DisplayName("openAccount rejects inactive product")
        void openAccount_rejectsInactiveProduct() {
            product.setIsActive(false);
            OpenAccountRequest request = OpenAccountRequest.builder()
                    .customerId(1L)
                    .productCode("SAV-001")
                    .accountType(AccountType.INDIVIDUAL)
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(productRepository.findByCode("SAV-001")).thenReturn(Optional.of(product));

            assertThatThrownBy(() -> accountService.openAccount(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not active");
        }

        @Test
        @DisplayName("changeAccountStatus to CLOSED sets closed date")
        void changeAccountStatus_toClosedSetsClosedDate() {
            when(accountRepository.findByAccountNumberWithDetails("1000000001"))
                    .thenReturn(Optional.of(account));
            when(accountRepository.save(any(Account.class))).thenReturn(account);
            when(signatoryRepository.findByAccountIdWithCustomer(anyLong())).thenReturn(List.of());
            when(accountMapper.toResponse(any(Account.class))).thenReturn(new AccountResponse());

            accountService.changeAccountStatus("1000000001", AccountStatus.CLOSED, "Account closure requested");

            verify(accountValidator).validateStatusTransition(AccountStatus.ACTIVE, AccountStatus.CLOSED);
            verify(accountValidator).validateAccountClosure(account);
            assertThat(account.getClosedDate()).isNotNull();
        }
    }
}
