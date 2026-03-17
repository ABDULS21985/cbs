package com.cbs.customer;

import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.DuplicateResourceException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.customer.dto.*;
import com.cbs.customer.entity.*;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.*;
import com.cbs.customer.service.CustomerService;
import com.cbs.customer.validation.CustomerValidator;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

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

    @InjectMocks
    private CustomerService customerService;

    private Customer testCustomer;
    private CustomerResponse testResponse;

    @BeforeEach
    void setUp() {
        testCustomer = Customer.builder()
                .id(1L)
                .cifNumber("CIF0000100000")
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .riskRating(RiskRating.MEDIUM)
                .firstName("Amina")
                .lastName("Bakare")
                .email("amina@example.com")
                .phonePrimary("+2348012345678")
                .dateOfBirth(LocalDate.of(1990, 3, 15))
                .nationality("NGA")
                .branchCode("ABJ001")
                .build();

        testResponse = CustomerResponse.builder()
                .id(1L)
                .cifNumber("CIF0000100000")
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .firstName("Amina")
                .lastName("Bakare")
                .displayName("Amina Bakare")
                .email("amina@example.com")
                .phonePrimary("+2348012345678")
                .build();
    }

    @Nested
    @DisplayName("Capability 1: 360° Customer View")
    class CustomerViewTests {

        @Test
        @DisplayName("Should return full 360° customer view by ID")
        void getCustomer360_Success() {
            when(customerRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(testCustomer));
            when(relationshipRepository.findAllRelationships(1L)).thenReturn(List.of());
            when(noteRepository.findByCustomerIdAndIsPinnedTrue(1L)).thenReturn(List.of());
            when(customerMapper.toResponse(testCustomer)).thenReturn(testResponse);
            when(customerMapper.toRelationshipDtoList(any())).thenReturn(List.of());
            when(customerMapper.toNoteDtoList(any())).thenReturn(List.of());

            CustomerResponse result = customerService.getCustomer360(1L);

            assertThat(result).isNotNull();
            assertThat(result.getCifNumber()).isEqualTo("CIF0000100000");
            assertThat(result.getDisplayName()).isEqualTo("Amina Bakare");
            verify(customerRepository).findByIdWithDetails(1L);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for non-existent customer")
        void getCustomer360_NotFound() {
            when(customerRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> customerService.getCustomer360(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Should return customer by CIF number")
        void getCustomerByCif_Success() {
            when(customerRepository.findByCifNumberWithDetails("CIF0000100000")).thenReturn(Optional.of(testCustomer));
            when(relationshipRepository.findAllRelationships(1L)).thenReturn(List.of());
            when(customerMapper.toResponse(testCustomer)).thenReturn(testResponse);
            when(customerMapper.toRelationshipDtoList(any())).thenReturn(List.of());

            CustomerResponse result = customerService.getCustomerByCif("CIF0000100000");

            assertThat(result.getCifNumber()).isEqualTo("CIF0000100000");
        }

        @Test
        @DisplayName("Should search customers with criteria")
        void searchCustomers_Success() {
            CustomerSearchCriteria criteria = CustomerSearchCriteria.builder()
                    .customerType(CustomerType.INDIVIDUAL)
                    .status(CustomerStatus.ACTIVE)
                    .build();
            Pageable pageable = PageRequest.of(0, 20);

            CustomerSummaryResponse summary = CustomerSummaryResponse.builder()
                    .id(1L).cifNumber("CIF0000100000").displayName("Amina Bakare").build();

            Page<Customer> customerPage = new PageImpl<>(List.of(testCustomer));
            when(customerRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(customerPage);
            when(customerMapper.toSummaryResponse(testCustomer)).thenReturn(summary);

            Page<CustomerSummaryResponse> result = customerService.searchCustomers(criteria, pageable);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getDisplayName()).isEqualTo("Amina Bakare");
        }
    }

    @Nested
    @DisplayName("Capability 2: Multi-Entity Customer Onboarding")
    class OnboardingTests {

        @Test
        @DisplayName("Should create individual customer successfully")
        void createCustomer_Individual_Success() {
            CreateCustomerRequest request = CreateCustomerRequest.builder()
                    .customerType(CustomerType.INDIVIDUAL)
                    .firstName("Amina")
                    .lastName("Bakare")
                    .dateOfBirth(LocalDate.of(1990, 3, 15))
                    .email("amina@example.com")
                    .phonePrimary("+2348012345678")
                    .branchCode("ABJ001")
                    .onboardedChannel("MOBILE")
                    .build();

            when(customerRepository.existsByEmail("amina@example.com")).thenReturn(false);
            when(customerRepository.existsByPhonePrimary("+2348012345678")).thenReturn(false);
            when(customerMapper.toEntity(request)).thenReturn(testCustomer);
            when(customerRepository.getNextCifSequence()).thenReturn(100000L);
            when(numberGenerator.generateCif(100000L)).thenReturn("CIF0000100000");
            when(customerRepository.save(any(Customer.class))).thenReturn(testCustomer);
            when(customerMapper.toResponse(testCustomer)).thenReturn(testResponse);
            CbsProperties.Deployment deployment = new CbsProperties.Deployment();
            when(cbsProperties.getDeployment()).thenReturn(deployment);

            CustomerResponse result = customerService.createCustomer(request);

            assertThat(result).isNotNull();
            verify(customerValidator).validateCreateRequest(request);
            verify(customerRepository).save(any(Customer.class));
        }

        @Test
        @DisplayName("Should reject duplicate email during onboarding")
        void createCustomer_DuplicateEmail() {
            CreateCustomerRequest request = CreateCustomerRequest.builder()
                    .customerType(CustomerType.INDIVIDUAL)
                    .firstName("Test")
                    .lastName("User")
                    .email("existing@example.com")
                    .dateOfBirth(LocalDate.of(1990, 1, 1))
                    .build();

            when(customerRepository.existsByEmail("existing@example.com")).thenReturn(true);

            assertThatThrownBy(() -> customerService.createCustomer(request))
                    .isInstanceOf(DuplicateResourceException.class);
        }

        @Test
        @DisplayName("Should create corporate customer successfully")
        void createCustomer_Corporate_Success() {
            CreateCustomerRequest request = CreateCustomerRequest.builder()
                    .customerType(CustomerType.CORPORATE)
                    .registeredName("Acme Industries Ltd")
                    .registrationNumber("RC123456")
                    .email("info@acme.ng")
                    .phonePrimary("+2349087654321")
                    .build();

            Customer corpCustomer = Customer.builder()
                    .id(2L).cifNumber("CIF0000100001").customerType(CustomerType.CORPORATE)
                    .registeredName("Acme Industries Ltd").status(CustomerStatus.ACTIVE)
                    .build();
            CustomerResponse corpResponse = CustomerResponse.builder()
                    .id(2L).cifNumber("CIF0000100001").customerType(CustomerType.CORPORATE)
                    .registeredName("Acme Industries Ltd").build();

            when(customerRepository.existsByEmail("info@acme.ng")).thenReturn(false);
            when(customerRepository.existsByPhonePrimary("+2349087654321")).thenReturn(false);
            when(customerMapper.toEntity(request)).thenReturn(corpCustomer);
            when(customerRepository.getNextCifSequence()).thenReturn(100001L);
            when(numberGenerator.generateCif(100001L)).thenReturn("CIF0000100001");
            when(customerRepository.save(any(Customer.class))).thenReturn(corpCustomer);
            when(customerMapper.toResponse(corpCustomer)).thenReturn(corpResponse);
            CbsProperties.Deployment deployment = new CbsProperties.Deployment();
            when(cbsProperties.getDeployment()).thenReturn(deployment);

            CustomerResponse result = customerService.createCustomer(request);
            assertThat(result.getCustomerType()).isEqualTo(CustomerType.CORPORATE);
        }

        @Test
        @DisplayName("Should change customer status with valid transition")
        void changeStatus_ValidTransition() {
            CustomerStatusChangeRequest request = CustomerStatusChangeRequest.builder()
                    .newStatus(CustomerStatus.DORMANT)
                    .reason("No transactions in 12 months")
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(customerRepository.save(any(Customer.class))).thenReturn(testCustomer);
            when(noteRepository.save(any(CustomerNote.class))).thenReturn(new CustomerNote());
            when(customerMapper.toResponse(testCustomer)).thenReturn(testResponse);

            customerService.changeStatus(1L, request);

            verify(customerValidator).validateStatusTransition(CustomerStatus.ACTIVE, CustomerStatus.DORMANT);
            verify(noteRepository).save(any(CustomerNote.class));
        }
    }

    @Nested
    @DisplayName("Capability 3: eKYC & Digital Identity Verification")
    class KycTests {

        @Test
        @DisplayName("Should verify a valid ID via KycProvider")
        void verifyId_Success() {
            KycVerificationRequest request = KycVerificationRequest.builder()
                    .customerId(1L)
                    .idType("NATIONAL_ID")
                    .idNumber("12345678901")
                    .build();

            CustomerIdentification idDoc = CustomerIdentification.builder()
                    .id(10L).idType("NATIONAL_ID").idNumber("12345678901")
                    .isVerified(false).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(identificationRepository.findByCustomerIdAndIdTypeAndIdNumber(1L, "NATIONAL_ID", "12345678901"))
                    .thenReturn(Optional.of(idDoc));
            when(identificationRepository.save(any())).thenReturn(idDoc);

            CbsProperties.Deployment deployment = new CbsProperties.Deployment();
            when(cbsProperties.getDeployment()).thenReturn(deployment);

            when(kycProvider.verify(any())).thenReturn(KycProvider.KycResult.builder()
                    .verified(true).status("VERIFIED").providerName("INTERNAL")
                    .providerReference("INT-123").verifiedAt(java.time.Instant.now())
                    .build());

            KycVerificationResponse result = customerService.verifyIdentification(request);

            assertThat(result.getStatus()).isEqualTo(KycVerificationResponse.VerificationStatus.VERIFIED);
            assertThat(result.getVerificationProvider()).isEqualTo("INTERNAL");
        }

        @Test
        @DisplayName("Should reject expired ID document")
        void verifyExpiredDoc() {
            KycVerificationRequest request = KycVerificationRequest.builder()
                    .customerId(1L)
                    .idType("INTL_PASSPORT")
                    .idNumber("A12345678")
                    .build();

            CustomerIdentification expiredDoc = CustomerIdentification.builder()
                    .id(11L).idType("INTL_PASSPORT").idNumber("A12345678")
                    .expiryDate(LocalDate.of(2020, 1, 1))
                    .isVerified(false).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(identificationRepository.findByCustomerIdAndIdTypeAndIdNumber(1L, "INTL_PASSPORT", "A12345678"))
                    .thenReturn(Optional.of(expiredDoc));

            KycVerificationResponse result = customerService.verifyIdentification(request);

            assertThat(result.getStatus()).isEqualTo(KycVerificationResponse.VerificationStatus.EXPIRED_DOCUMENT);
        }

        @Test
        @DisplayName("Should add identification document to customer")
        void addIdentification_Success() {
            IdentificationDto dto = IdentificationDto.builder()
                    .idType("NIN").idNumber("12345678901").isPrimary(true).build();

            CustomerIdentification entity = CustomerIdentification.builder()
                    .id(12L).idType("NIN").idNumber("12345678901").isPrimary(true).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(identificationRepository.findByCustomerIdAndIdTypeAndIdNumber(1L, "NIN", "12345678901"))
                    .thenReturn(Optional.empty());
            when(customerMapper.toIdentificationEntity(dto)).thenReturn(entity);
            when(identificationRepository.save(any())).thenReturn(entity);
            when(customerMapper.toIdentificationDto(entity)).thenReturn(dto);

            IdentificationDto result = customerService.addIdentification(1L, dto);

            assertThat(result.getIdType()).isEqualTo("NIN");
            verify(identificationRepository).clearPrimaryFlag(1L, 0L);
        }
    }

    @Nested
    @DisplayName("Capability 4: Flexible Account Structures")
    class AccountStructureTests {

        @Test
        @DisplayName("Should add address to customer")
        void addAddress_Success() {
            AddressDto dto = AddressDto.builder()
                    .addressType(AddressType.RESIDENTIAL)
                    .addressLine1("12 Marina Road")
                    .city("Lagos")
                    .state("Lagos")
                    .country("NGA")
                    .isPrimary(true)
                    .build();

            CustomerAddress entity = CustomerAddress.builder()
                    .id(5L).addressType(AddressType.RESIDENTIAL)
                    .addressLine1("12 Marina Road").city("Lagos").build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(customerMapper.toAddressEntity(dto)).thenReturn(entity);
            when(addressRepository.save(any())).thenReturn(entity);
            when(customerMapper.toAddressDto(entity)).thenReturn(dto);

            AddressDto result = customerService.addAddress(1L, dto);

            assertThat(result.getCity()).isEqualTo("Lagos");
            verify(addressRepository).clearPrimaryFlag(1L, 0L);
        }

        @Test
        @DisplayName("Should add relationship between customers")
        void addRelationship_Success() {
            Customer relatedCustomer = Customer.builder()
                    .id(2L).cifNumber("CIF0000100001")
                    .customerType(CustomerType.INDIVIDUAL)
                    .firstName("Bola").lastName("Bakare")
                    .build();

            RelationshipDto dto = RelationshipDto.builder()
                    .relatedCustomerId(2L)
                    .relationshipType(RelationshipType.SPOUSE)
                    .build();

            CustomerRelationship entity = CustomerRelationship.builder()
                    .id(1L).customer(testCustomer).relatedCustomer(relatedCustomer)
                    .relationshipType(RelationshipType.SPOUSE).build();

            RelationshipDto responseDto = RelationshipDto.builder()
                    .id(1L).customerId(1L).relatedCustomerId(2L)
                    .relationshipType(RelationshipType.SPOUSE).build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));
            when(customerRepository.findById(2L)).thenReturn(Optional.of(relatedCustomer));
            when(relationshipRepository.existsByCustomerIdAndRelatedCustomerIdAndRelationshipType(
                    1L, 2L, RelationshipType.SPOUSE)).thenReturn(false);
            when(relationshipRepository.save(any())).thenReturn(entity);
            when(customerMapper.toRelationshipDto(entity)).thenReturn(responseDto);

            RelationshipDto result = customerService.addRelationship(1L, dto);

            assertThat(result.getRelationshipType()).isEqualTo(RelationshipType.SPOUSE);
        }

        @Test
        @DisplayName("Should reject self-relationship")
        void addRelationship_SelfRelationship() {
            RelationshipDto dto = RelationshipDto.builder()
                    .relatedCustomerId(1L)
                    .relationshipType(RelationshipType.GUARANTOR)
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(testCustomer));

            assertThatThrownBy(() -> customerService.addRelationship(1L, dto))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("relationship with themselves");
        }
    }
}
