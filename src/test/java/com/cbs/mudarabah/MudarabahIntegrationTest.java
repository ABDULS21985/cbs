package com.cbs.mudarabah;

import com.cbs.AbstractIntegrationTest;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.gl.repository.JournalEntryRepository;
import com.cbs.mudarabah.dto.CustomerConsentDetails;
import com.cbs.mudarabah.dto.InitiatePsrChangeRequest;
import com.cbs.mudarabah.dto.MudarabahAccountResponse;
import com.cbs.mudarabah.dto.MudarabahDepositRequest;
import com.cbs.mudarabah.dto.OpenMudarabahSavingsRequest;
import com.cbs.mudarabah.dto.PsrChangeRequestResponse;
import com.cbs.mudarabah.entity.MudarabahType;
import com.cbs.mudarabah.repository.MudarabahAccountRepository;
import com.cbs.mudarabah.repository.PsrChangeRequestRepository;
import com.cbs.mudarabah.service.MudarabahAccountService;
import com.cbs.mudarabah.service.PsrService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class MudarabahIntegrationTest extends AbstractIntegrationTest {

        private static final String BASE_PRODUCT_CODE = "SA-STD";

    @Autowired
    private MudarabahAccountService mudarabahAccountService;

    @Autowired
    private PsrService psrService;

    @Autowired
    private MudarabahAccountRepository mudarabahAccountRepository;

    @Autowired
    private AccountRepository accountRepository;

        @Autowired
        private CustomerRepository customerRepository;

    @Autowired
    private TransactionJournalRepository transactionJournalRepository;

    @Autowired
    private JournalEntryRepository journalEntryRepository;

    @Autowired
    private PsrChangeRequestRepository psrChangeRequestRepository;

    // ---------------------------------------------------------------
    // Scenario 1: Open Mudarabah savings, verify DB, deposit, verify GL
    // ---------------------------------------------------------------

    @Test
    void openMudarabahSavingsAndDeposit_persistsAccountAndPostsGL() {
        Long customerId = createActiveCustomer("PRIMARY").getId();

        // Open account with initial deposit
        OpenMudarabahSavingsRequest openRequest = OpenMudarabahSavingsRequest.builder()
                .customerId(customerId)
                .productCode(BASE_PRODUCT_CODE)
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("5000.00"))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .profitReinvest(true)
                .lossDisclosureAccepted(true)
                .build();

        MudarabahAccountResponse response = mudarabahAccountService.openMudarabahSavingsAccount(openRequest);

        // Verify response fields
        assertThat(response.getId()).isNotNull();
        assertThat(response.getAccountId()).isNotNull();
        assertThat(response.getContractReference()).startsWith("MDR-SAV-");
        assertThat(response.getMudarabahType()).isEqualTo("UNRESTRICTED");
        assertThat(response.getAccountSubType()).isEqualTo("SAVINGS");
        assertThat(response.getProfitSharingRatioCustomer()).isEqualByComparingTo(new BigDecimal("70.0000"));
        assertThat(response.getProfitSharingRatioBank()).isEqualByComparingTo(new BigDecimal("30.0000"));
        assertThat(response.isLossDisclosureAccepted()).isTrue();
        assertThat(response.getStatus()).isEqualTo("ACTIVE");
        assertThat(response.getContractVersion()).isEqualTo(1);

        // Verify persisted in DB
        assertThat(mudarabahAccountRepository.findByAccountId(response.getAccountId())).isPresent();
        assertThat(accountRepository.findById(response.getAccountId())).isPresent();

        // Verify the initial deposit created a transaction journal entry
        var transactions = transactionJournalRepository
                .findByAccountIdOrderByCreatedAtDesc(response.getAccountId(), PageRequest.of(0, 10));
        assertThat(transactions.getContent()).isNotEmpty();
        assertThat(transactions.getContent().get(0).getAmount())
                .isEqualByComparingTo(new BigDecimal("5000.00"));

        // Verify GL journal entry was posted for the opening deposit
        var glEntries = journalEntryRepository
                .findBySourceModuleAndSourceRef("MUDARABAH", response.getContractReference(), PageRequest.of(0, 10));
        assertThat(glEntries.getContent()).isNotEmpty();

        // Now make an additional deposit
        MudarabahDepositRequest depositRequest = MudarabahDepositRequest.builder()
                .amount(new BigDecimal("2500.00"))
                .narration("Additional Mudarabah deposit")
                .externalRef("EXT-DEP-001")
                .build();

        MudarabahAccountResponse afterDeposit = mudarabahAccountService.deposit(response.getAccountId(), depositRequest);

        // Verify balance updated
        assertThat(afterDeposit.getBookBalance()).isEqualByComparingTo(new BigDecimal("7500.00"));

        // Verify second transaction recorded
        var allTransactions = transactionJournalRepository
                .findByAccountIdOrderByCreatedAtDesc(response.getAccountId(), PageRequest.of(0, 10));
        assertThat(allTransactions.getTotalElements()).isGreaterThanOrEqualTo(2);
    }

    // ---------------------------------------------------------------
    // Scenario 2: PSR 60:50 (sum = 110) -> validation error
    // ---------------------------------------------------------------

    @Test
    void openWithInvalidPsr_sumNot100_throwsBusinessException() {
        Long customerId = createActiveCustomer("SECONDARY").getId();

        OpenMudarabahSavingsRequest request = OpenMudarabahSavingsRequest.builder()
                .customerId(customerId)
                .productCode(BASE_PRODUCT_CODE)
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("1000.00"))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("60.0000"))
                .profitSharingRatioBank(new BigDecimal("50.0000"))
                .profitReinvest(false)
                .lossDisclosureAccepted(true)
                .build();

        assertThatThrownBy(() -> mudarabahAccountService.openMudarabahSavingsAccount(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must equal exactly 100");

        // Verify no account was created
        assertThat(mudarabahAccountRepository.findAll().stream()
                .filter(a -> a.getAccount() != null)
                .count()).isZero();
    }

    // ---------------------------------------------------------------
    // Scenario 3: Open without loss disclosure -> rejection
    // ---------------------------------------------------------------

    @Test
    void openWithoutLossDisclosure_throwsBusinessException() {
        Long customerId = createActiveCustomer("PRIMARY").getId();

        OpenMudarabahSavingsRequest request = OpenMudarabahSavingsRequest.builder()
                .customerId(customerId)
                .productCode(BASE_PRODUCT_CODE)
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("1000.00"))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .profitReinvest(false)
                .lossDisclosureAccepted(false)
                .build();

        assertThatThrownBy(() -> mudarabahAccountService.openMudarabahSavingsAccount(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Loss disclosure must be accepted");
    }

    // ---------------------------------------------------------------
    // Scenario 4: PSR change lifecycle: initiate -> consent -> approve -> apply
    // ---------------------------------------------------------------

    @Test
    void psrChangeLifecycle_initiateConsentApproveApply_updatesAccount() {
        Long customerId = createActiveCustomer("SECONDARY").getId();

        // First, open a Mudarabah savings account with default PSR 70:30
        OpenMudarabahSavingsRequest openRequest = OpenMudarabahSavingsRequest.builder()
                .customerId(customerId)
                .productCode(BASE_PRODUCT_CODE)
                .currencyCode("SAR")
                .initialDeposit(new BigDecimal("10000.00"))
                .mudarabahType(MudarabahType.UNRESTRICTED)
                .profitSharingRatioCustomer(new BigDecimal("70.0000"))
                .profitSharingRatioBank(new BigDecimal("30.0000"))
                .profitReinvest(true)
                .lossDisclosureAccepted(true)
                .build();

        MudarabahAccountResponse account = mudarabahAccountService.openMudarabahSavingsAccount(openRequest);
        Long accountId = account.getAccountId();
        Long mudarabahAccountId = account.getId();

        // Verify initial PSR
        assertThat(account.getProfitSharingRatioCustomer()).isEqualByComparingTo(new BigDecimal("70.0000"));
        assertThat(account.getProfitSharingRatioBank()).isEqualByComparingTo(new BigDecimal("30.0000"));

        // Step 1: Initiate PSR change request (propose 65:35)
        InitiatePsrChangeRequest changeRequest = InitiatePsrChangeRequest.builder()
                .accountId(accountId)
                .mudarabahAccountId(mudarabahAccountId)
                .proposedPsrCustomer(new BigDecimal("65.0000"))
                .proposedPsrBank(new BigDecimal("35.0000"))
                .changeReason("CUSTOMER_RENEGOTIATION")
                .reasonDescription("Customer requested adjusted profit sharing")
                .effectiveDate(LocalDate.now())
                .build();

        PsrChangeRequestResponse changeResponse = psrService.initiateChangeRequest(changeRequest);
        assertThat(changeResponse.getId()).isNotNull();
        assertThat(changeResponse.getStatus()).isEqualTo("DRAFT");
        assertThat(changeResponse.getProposedPsrCustomer()).isEqualByComparingTo(new BigDecimal("65.0000"));
        assertThat(changeResponse.getProposedPsrBank()).isEqualByComparingTo(new BigDecimal("35.0000"));
        assertThat(changeResponse.isCustomerConsentRequired()).isTrue();
        assertThat(changeResponse.isCustomerConsentGiven()).isFalse();

        Long changeRequestId = changeResponse.getId();

        // Step 2: Record customer consent
        CustomerConsentDetails consent = CustomerConsentDetails.builder()
                .consentMethod("ONLINE_ACCEPTANCE")
                .consentDate(LocalDateTime.now())
                .build();

        psrService.recordCustomerConsent(changeRequestId, consent);

        // Verify consent was recorded
        var afterConsent = psrChangeRequestRepository.findById(changeRequestId).orElseThrow();
        assertThat(afterConsent.isCustomerConsentGiven()).isTrue();
        assertThat(afterConsent.getStatus().name()).isEqualTo("CONSENT_GIVEN");

        // Step 3: Approve the change
        psrService.approvePsrChange(changeRequestId, "SHARIAH_OFFICER_01");

        var afterApproval = psrChangeRequestRepository.findById(changeRequestId).orElseThrow();
        assertThat(afterApproval.getStatus().name()).isEqualTo("APPROVED");
        assertThat(afterApproval.getApprovedBy()).isEqualTo("SHARIAH_OFFICER_01");

        // Step 4: Apply the change
        psrService.applyPsrChange(changeRequestId);

        // Verify change request is APPLIED
        var afterApply = psrChangeRequestRepository.findById(changeRequestId).orElseThrow();
        assertThat(afterApply.getStatus().name()).isEqualTo("APPLIED");
        assertThat(afterApply.getAppliedAt()).isNotNull();

        // Verify the Mudarabah account PSR was updated
        MudarabahAccountResponse updatedAccount = mudarabahAccountService.getMudarabahAccount(accountId);
        assertThat(updatedAccount.getProfitSharingRatioCustomer()).isEqualByComparingTo(new BigDecimal("65.0000"));
        assertThat(updatedAccount.getProfitSharingRatioBank()).isEqualByComparingTo(new BigDecimal("35.0000"));
        assertThat(updatedAccount.getContractVersion()).isEqualTo(2);
    }

        private Customer createActiveCustomer(String label) {
                String suffix = label + "-" + Instant.now().toEpochMilli();
                return customerRepository.save(Customer.builder()
                                .cifNumber("CIF-" + suffix)
                                .customerType(CustomerType.INDIVIDUAL)
                                .firstName(label)
                                .lastName("Customer")
                                .email(label.toLowerCase() + "." + Instant.now().toEpochMilli() + "@example.com")
                                .phonePrimary("+234" + String.format("%010d", Math.abs(suffix.hashCode()) % 1_000_000_0000L))
                                .branchCode("BR001")
                                .nationality("NGA")
                                .countryOfResidence("NGA")
                                .createdBy("test")
                                .updatedBy("test")
                                .build());
        }
}
