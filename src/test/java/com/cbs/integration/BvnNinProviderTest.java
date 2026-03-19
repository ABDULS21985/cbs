package com.cbs.integration;

import com.cbs.common.config.CbsProperties;
import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.customer.mapper.CustomerMapper;
import com.cbs.customer.repository.*;
import com.cbs.customer.service.CustomerService;
import com.cbs.customer.validation.CustomerValidator;
import com.cbs.customer.entity.Customer;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.lending.repository.LoanAccountRepository;
import com.cbs.provider.kyc.InternalKycProvider;
import com.cbs.provider.kyc.KycProvider;
import com.cbs.provider.numbering.AccountNumberGenerator;
import com.cbs.segmentation.repository.SegmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BvnNinProviderTest {

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
    @Mock private AccountRepository accountRepository;
    @Mock private LoanAccountRepository loanAccountRepository;
    @Mock private TransactionJournalRepository transactionJournalRepository;
    @Mock private SegmentRepository segmentRepository;

    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        SyntheticCapabilityGuard.enableInternalKycForTesting();

        customerService = new CustomerService(
                customerRepository,
                addressRepository,
                identificationRepository,
                relationshipRepository,
                noteRepository,
                customerMapper,
                customerValidator,
                kycProvider,
                numberGenerator,
                cbsProperties,
                accountRepository,
                loanAccountRepository,
                transactionJournalRepository,
                segmentRepository
        );

    }

    @Test
    @DisplayName("BVN validation format remains 11 digits")
    void bvnFormatValidation() {
        assertThat(customerService.isValidBvn("12345678901")).isTrue();
        assertThat(customerService.isValidBvn("1234567890")).isFalse();
        assertThat(customerService.isValidBvn("ABCDEFGHIJK")).isFalse();
    }

    @Test
    @DisplayName("BVN verification request includes required provider fields")
    void bvnVerificationRequest() {
        CbsProperties.Deployment deployment = new CbsProperties.Deployment();
        deployment.setInstitutionCode("999999");
        lenient().when(cbsProperties.getDeployment()).thenReturn(deployment);

        CustomerService.BvnVerificationRequestPayload request =
                customerService.buildBvnVerificationRequest("12345678901");

        assertThat(request.bvn()).hasSize(11);
        assertThat(request.institutionCode()).isNotBlank();
        assertThat(request.channelCode()).isNotBlank();
    }

    @Test
    @DisplayName("BVN response mismatch triggers KYC failure")
    void bvnMismatchTriggersFailure() {
        Customer customer = Customer.builder()
                .id(1L)
                .firstName("JANE")
                .lastName("DOE")
                .build();
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

        CustomerService.BvnVerificationResult result = customerService.verifyBvn(
                1L,
                new CustomerService.BvnProviderResponse("12345678901", "JOHN", null, "DOE")
        );

        assertThat(result.status()).isEqualTo("FAILED");
        assertThat(result.mismatchFields()).contains("firstName");
    }

    @Test
    @DisplayName("NIN provider contract rejects malformed identifiers")
    void ninFormatValidation() {
        CbsProperties properties = new CbsProperties();
        CbsProperties.KycConfig.IdTypeConfig nin = new CbsProperties.KycConfig.IdTypeConfig();
        nin.setCode("NIN");
        nin.setValidationRegex("\\d{11}");
        properties.getKyc().getIdTypes().add(nin);
        InternalKycProvider provider = new InternalKycProvider(properties);

        KycProvider.KycResult result = provider.verify(KycProvider.KycVerifyCommand.builder()
                .idType("NIN")
                .idNumber("1234567890")
                .country("NGA")
                .build());

        assertThat(result.isVerified()).isFalse();
        assertThat(result.getFailureReason()).contains("expected format");
    }
}
