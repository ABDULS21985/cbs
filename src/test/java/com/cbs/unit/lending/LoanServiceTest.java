package com.cbs.unit.lending;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.collections.dto.CollectionCaseResponse;
import com.cbs.collections.entity.*;
import com.cbs.collections.repository.CollectionActionRepository;
import com.cbs.collections.repository.CollectionCaseRepository;
import com.cbs.collections.service.CollectionsService;
import com.cbs.common.config.CbsProperties;
import com.cbs.common.exception.BusinessException;
import com.cbs.credit.engine.CreditDecisionEngine;
import com.cbs.credit.repository.CreditDecisionLogRepository;
import com.cbs.credit.repository.CreditScoringModelRepository;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.repository.CustomerRepository;
import com.cbs.lending.dto.LoanApplicationRequest;
import com.cbs.lending.dto.LoanApplicationResponse;
import com.cbs.lending.dto.LoanApprovalRequest;
import com.cbs.lending.dto.ScheduleEntryDto;
import com.cbs.lending.engine.RepaymentScheduleGenerator;
import com.cbs.lending.entity.*;
import com.cbs.lending.repository.*;
import com.cbs.lending.service.LoanOriginationService;
import com.cbs.mortgage.entity.MortgageLoan;
import com.cbs.mortgage.repository.MortgageLoanRepository;
import com.cbs.mortgage.service.MortgageService;
import com.cbs.provider.interest.DayCountEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoanServiceTest {

    // ========================================================================
    // LoanOriginationService tests
    // ========================================================================

    @Nested
    @DisplayName("LoanOriginationService Tests")
    @ExtendWith(MockitoExtension.class)
    class LoanOriginationServiceTests {

        @Mock private LoanApplicationRepository applicationRepository;
        @Mock private LoanAccountRepository loanAccountRepository;
        @Mock private LoanProductRepository productRepository;
        @Mock private LoanRepaymentScheduleRepository scheduleRepository;
        @Mock private CollateralRepository collateralRepository;
        @Mock private CustomerRepository customerRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private CreditScoringModelRepository scoringModelRepository;
        @Mock private CreditDecisionLogRepository decisionLogRepository;
        @Mock private CreditDecisionEngine creditEngine;
        @Mock private RepaymentScheduleGenerator scheduleGenerator;
        @Mock private DayCountEngine dayCountEngine;
        @Mock private CbsProperties cbsProperties;

        @InjectMocks private LoanOriginationService loanOriginationService;

        private Customer customer;
        private LoanProduct loanProduct;

        @BeforeEach
        void setUp() {
            customer = new Customer();
            customer.setId(1L);
            customer.setCifNumber("CIF0000000001");
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setCustomerType(CustomerType.INDIVIDUAL);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            loanProduct = new LoanProduct();
            loanProduct.setId(1L);
            loanProduct.setCode("PL-001");
            loanProduct.setName("Personal Loan");
            loanProduct.setLoanType(LoanType.PERSONAL);
            loanProduct.setTargetSegment("RETAIL");
            loanProduct.setCurrencyCode("USD");
            loanProduct.setMinLoanAmount(new BigDecimal("1000.00"));
            loanProduct.setMaxLoanAmount(new BigDecimal("500000.00"));
            loanProduct.setMinTenureMonths(6);
            loanProduct.setMaxTenureMonths(60);
            loanProduct.setDefaultInterestRate(new BigDecimal("12.00"));
            loanProduct.setIsActive(true);
            loanProduct.setIsIslamic(false);
        }

        @Test
        @DisplayName("submitApplication creates application with SUBMITTED status")
        void submitApplication_createsApplicationWithSubmittedStatus() {
            LoanApplicationRequest request = LoanApplicationRequest.builder()
                    .customerId(1L)
                    .loanProductCode("PL-001")
                    .requestedAmount(new BigDecimal("50000.00"))
                    .requestedTenureMonths(24)
                    .purpose("Home renovation")
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(productRepository.findByCode("PL-001")).thenReturn(Optional.of(loanProduct));
            when(applicationRepository.getNextApplicationSequence()).thenReturn(1L);
            when(applicationRepository.save(any(LoanApplication.class))).thenAnswer(inv -> {
                LoanApplication app = inv.getArgument(0);
                app.setId(1L);
                return app;
            });

            LoanApplicationResponse result = loanOriginationService.submitApplication(request);

            assertThat(result).isNotNull();
            assertThat(result.getApplicationNumber()).isEqualTo("LA000000000001");
            assertThat(result.getStatus()).isEqualTo(LoanApplicationStatus.SUBMITTED);
            verify(applicationRepository).save(any(LoanApplication.class));
        }

        @Test
        @DisplayName("submitApplication rejects non-active customer")
        void submitApplication_rejectsNonActiveCustomer() {
            customer.setStatus(CustomerStatus.SUSPENDED);
            LoanApplicationRequest request = LoanApplicationRequest.builder()
                    .customerId(1L)
                    .loanProductCode("PL-001")
                    .requestedAmount(new BigDecimal("50000.00"))
                    .requestedTenureMonths(24)
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));

            assertThatThrownBy(() -> loanOriginationService.submitApplication(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not active");
        }

        @Test
        @DisplayName("submitApplication validates amount against product limits")
        void submitApplication_rejectsAmountBelowMinimum() {
            LoanApplicationRequest request = LoanApplicationRequest.builder()
                    .customerId(1L)
                    .loanProductCode("PL-001")
                    .requestedAmount(new BigDecimal("100.00"))  // Below min of 1000
                    .requestedTenureMonths(24)
                    .build();

            when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
            when(productRepository.findByCode("PL-001")).thenReturn(Optional.of(loanProduct));

            assertThatThrownBy(() -> loanOriginationService.submitApplication(request))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("below product minimum");
        }

        @Test
        @DisplayName("approveApplication rejects application not under review")
        void approveApplication_rejectsInvalidState() {
            LoanApplication app = new LoanApplication();
            app.setId(1L);
            app.setApplicationNumber("LA000000000001");
            app.setCustomer(customer);
            app.setLoanProduct(loanProduct);
            app.setStatus(LoanApplicationStatus.SUBMITTED);
            app.setRequestedAmount(new BigDecimal("50000.00"));
            app.setCurrencyCode("USD");
            app.setRequestedTenureMonths(24);
            app.setRateType("FIXED");
            app.setRepaymentScheduleType(RepaymentScheduleType.EQUAL_INSTALLMENT);
            app.setRepaymentFrequency("MONTHLY");

            LoanApprovalRequest approval = LoanApprovalRequest.builder()
                    .approvedAmount(new BigDecimal("50000.00"))
                    .approvedTenureMonths(24)
                    .approvedRate(new BigDecimal("12.00"))
                    .build();

            when(applicationRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(app));

            assertThatThrownBy(() -> loanOriginationService.approveApplication(1L, approval, "admin"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not in a reviewable state");
        }

        @Test
        @DisplayName("processRepayment applies payment to interest first, then principal")
        void processRepayment_appliesInterestFirst() {
            Account repaymentAccount = new Account();
            repaymentAccount.setId(20L);
            repaymentAccount.setAccountNumber("3000000001");
            repaymentAccount.setBookBalance(new BigDecimal("100000.00"));
            repaymentAccount.setAvailableBalance(new BigDecimal("100000.00"));

            LoanAccount loanAccount = new LoanAccount();
            loanAccount.setId(1L);
            loanAccount.setLoanNumber("LN000000000001");
            loanAccount.setCustomer(customer);
            loanAccount.setLoanProduct(loanProduct);
            loanAccount.setRepaymentAccount(repaymentAccount);
            loanAccount.setOutstandingPrincipal(new BigDecimal("48000.00"));
            loanAccount.setAccruedInterest(BigDecimal.ZERO);
            loanAccount.setTotalInterestCharged(BigDecimal.ZERO);
            loanAccount.setTotalInterestPaid(BigDecimal.ZERO);
            loanAccount.setTotalPenalties(BigDecimal.ZERO);
            loanAccount.setTotalPenaltiesPaid(BigDecimal.ZERO);
            loanAccount.setStatus(LoanAccountStatus.ACTIVE);
            loanAccount.setDaysPastDue(0);
            loanAccount.setDelinquencyBucket("CURRENT");
            loanAccount.setIfrs9Stage(1);
            loanAccount.setPaidInstallments(0);
            loanAccount.setCurrencyCode("USD");

            LoanRepaymentSchedule installment = new LoanRepaymentSchedule();
            installment.setId(1L);
            installment.setInstallmentNumber(1);
            installment.setDueDate(LocalDate.now());
            installment.setPrincipalDue(new BigDecimal("2000.00"));
            installment.setInterestDue(new BigDecimal("500.00"));
            installment.setTotalDue(new BigDecimal("2500.00"));
            installment.setPrincipalPaid(BigDecimal.ZERO);
            installment.setInterestPaid(BigDecimal.ZERO);
            installment.setTotalPaid(BigDecimal.ZERO);
            installment.setOutstanding(new BigDecimal("2500.00"));
            installment.setStatus(ScheduleInstallmentStatus.PENDING);

            when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(loanAccount));
            when(scheduleRepository.findPendingInstallments(1L)).thenReturn(List.of(installment));
            when(scheduleRepository.save(any(LoanRepaymentSchedule.class))).thenAnswer(inv -> inv.getArgument(0));
            when(loanAccountRepository.save(any(LoanAccount.class))).thenReturn(loanAccount);
            when(accountRepository.save(any(Account.class))).thenReturn(repaymentAccount);

            ScheduleEntryDto result = loanOriginationService.processRepayment(1L, new BigDecimal("2500.00"));

            assertThat(result).isNotNull();
            // Interest paid first: 500, then principal: 2000
            assertThat(installment.getInterestPaid()).isEqualByComparingTo(new BigDecimal("500.00"));
            assertThat(installment.getPrincipalPaid()).isEqualByComparingTo(new BigDecimal("2000.00"));
            assertThat(installment.getStatus()).isEqualTo(ScheduleInstallmentStatus.PAID);
        }
    }

    // ========================================================================
    // MortgageService tests
    // ========================================================================

    @Nested
    @DisplayName("MortgageService Tests")
    @ExtendWith(MockitoExtension.class)
    class MortgageServiceTests {

        @Mock private MortgageLoanRepository mortgageRepository;

        @InjectMocks private MortgageService mortgageService;

        @Test
        @DisplayName("originate rejects LTV exceeding 95%")
        void originate_rejectsHighLtv() {
            MortgageLoan mortgage = MortgageLoan.builder()
                    .customerId(1L)
                    .accountId(10L)
                    .mortgageType("RESIDENTIAL")
                    .repaymentType("CAPITAL_AND_INTEREST")
                    .rateType("FIXED")
                    .propertyAddress("123 Main St")
                    .propertyType("HOUSE")
                    .propertyValuation(new BigDecimal("100000.00"))
                    .valuationDate(LocalDate.now())
                    .principalAmount(new BigDecimal("96000.00"))  // 96% LTV
                    .interestRate(new BigDecimal("4.50"))
                    .termMonths(300)
                    .build();

            assertThatThrownBy(() -> mortgageService.originate(mortgage))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("LTV exceeds maximum 95%");
        }

        @Test
        @DisplayName("advanceStatus validates mortgage status transitions")
        void advanceStatus_rejectsInvalidTransition() {
            MortgageLoan mortgage = MortgageLoan.builder()
                    .mortgageNumber("MTG-ABC1234567")
                    .customerId(1L)
                    .accountId(10L)
                    .mortgageType("RESIDENTIAL")
                    .repaymentType("CAPITAL_AND_INTEREST")
                    .rateType("FIXED")
                    .propertyAddress("123 Main St")
                    .propertyType("HOUSE")
                    .propertyValuation(new BigDecimal("200000.00"))
                    .valuationDate(LocalDate.now())
                    .principalAmount(new BigDecimal("160000.00"))
                    .currentBalance(new BigDecimal("160000.00"))
                    .interestRate(new BigDecimal("3.50"))
                    .termMonths(300)
                    .ltvAtOrigination(new BigDecimal("80.00"))
                    .status("APPLICATION")
                    .build();

            when(mortgageRepository.findByMortgageNumber("MTG-ABC1234567"))
                    .thenReturn(Optional.of(mortgage));

            // APPLICATION can only go to VALUATION
            assertThatThrownBy(() -> mortgageService.advanceStatus("MTG-ABC1234567", "ACTIVE"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Invalid transition");
        }

        @Test
        @DisplayName("makeOverpayment reduces current balance")
        void makeOverpayment_reducesBalance() {
            MortgageLoan mortgage = MortgageLoan.builder()
                    .mortgageNumber("MTG-ABC1234567")
                    .customerId(1L)
                    .accountId(10L)
                    .mortgageType("RESIDENTIAL")
                    .repaymentType("CAPITAL_AND_INTEREST")
                    .rateType("FIXED")
                    .propertyAddress("123 Main St")
                    .propertyType("HOUSE")
                    .propertyValuation(new BigDecimal("200000.00"))
                    .valuationDate(LocalDate.now())
                    .principalAmount(new BigDecimal("160000.00"))
                    .currentBalance(new BigDecimal("150000.00"))
                    .interestRate(new BigDecimal("3.50"))
                    .termMonths(300)
                    .remainingMonths(280)
                    .ltvAtOrigination(new BigDecimal("80.00"))
                    .status("ACTIVE")
                    .annualOverpaymentPct(new BigDecimal("10.00"))
                    .overpaymentsYtd(BigDecimal.ZERO)
                    .build();

            when(mortgageRepository.findByMortgageNumber("MTG-ABC1234567"))
                    .thenReturn(Optional.of(mortgage));
            when(mortgageRepository.save(any(MortgageLoan.class))).thenAnswer(inv -> inv.getArgument(0));

            MortgageLoan result = mortgageService.makeOverpayment("MTG-ABC1234567", new BigDecimal("5000.00"));

            assertThat(result.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("145000.00"));
            assertThat(result.getOverpaymentsYtd()).isEqualByComparingTo(new BigDecimal("5000.00"));
        }
    }

    // ========================================================================
    // CollectionsService tests
    // ========================================================================

    @Nested
    @DisplayName("CollectionsService Tests")
    @ExtendWith(MockitoExtension.class)
    class CollectionsServiceTests {

        @Mock private CollectionCaseRepository caseRepository;
        @Mock private CollectionActionRepository actionRepository;
        @Mock private LoanAccountRepository loanAccountRepository;

        @InjectMocks private CollectionsService collectionsService;

        @Test
        @DisplayName("createCase rejects non-delinquent loan")
        void createCase_rejectsNonDelinquentLoan() {
            Customer customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            LoanProduct loanProduct = new LoanProduct();
            loanProduct.setId(1L);
            loanProduct.setCode("PL-001");
            loanProduct.setName("Personal Loan");
            loanProduct.setLoanType(LoanType.PERSONAL);

            LoanAccount loan = new LoanAccount();
            loan.setId(1L);
            loan.setLoanNumber("LN000000000001");
            loan.setCustomer(customer);
            loan.setLoanProduct(loanProduct);
            loan.setDaysPastDue(0);
            loan.setOutstandingPrincipal(new BigDecimal("50000.00"));
            loan.setCurrencyCode("USD");
            loan.setStatus(LoanAccountStatus.ACTIVE);

            when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(loan));

            assertThatThrownBy(() -> collectionsService.createCase(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not delinquent");
        }

        @Test
        @DisplayName("createCase assigns CRITICAL priority for DPD > 90")
        void createCase_assignsCriticalPriorityForHighDpd() {
            Customer customer = new Customer();
            customer.setId(1L);
            customer.setFirstName("John");
            customer.setLastName("Doe");

            LoanProduct loanProduct = new LoanProduct();
            loanProduct.setId(1L);
            loanProduct.setCode("PL-001");
            loanProduct.setName("Personal Loan");
            loanProduct.setLoanType(LoanType.PERSONAL);

            LoanAccount loan = new LoanAccount();
            loan.setId(1L);
            loan.setLoanNumber("LN000000000001");
            loan.setCustomer(customer);
            loan.setLoanProduct(loanProduct);
            loan.setDaysPastDue(95);
            loan.setOutstandingPrincipal(new BigDecimal("50000.00"));
            loan.setAccruedInterest(new BigDecimal("2000.00"));
            loan.setTotalPenalties(new BigDecimal("500.00"));
            loan.setTotalPenaltiesPaid(BigDecimal.ZERO);
            loan.setCurrencyCode("USD");
            loan.setDelinquencyBucket("91-180");
            loan.setStatus(LoanAccountStatus.DELINQUENT);

            when(loanAccountRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(loan));
            when(caseRepository.findByLoanAccountIdAndStatusNot(1L, CollectionCaseStatus.CLOSED))
                    .thenReturn(Optional.empty());
            when(caseRepository.getNextCaseSequence()).thenReturn(1L);
            when(caseRepository.save(any(CollectionCase.class))).thenAnswer(inv -> {
                CollectionCase cc = inv.getArgument(0);
                cc.setId(1L);
                return cc;
            });
            when(actionRepository.findByCollectionCaseIdOrderByActionDateDesc(anyLong(), any(Pageable.class)))
                    .thenReturn(Page.empty());

            CollectionCaseResponse result = collectionsService.createCase(1L);

            assertThat(result).isNotNull();
            assertThat(result.getPriority()).isEqualTo(CollectionPriority.CRITICAL);
        }

        @Test
        @DisplayName("CollectionCase.escalate() transitions to LEGAL after 3 escalations")
        void escalate_transitionsToLegalAfterThreeEscalations() {
            CollectionCase cc = new CollectionCase();
            cc.setId(1L);
            cc.setEscalationLevel(0);
            cc.setStatus(CollectionCaseStatus.OPEN);

            cc.escalate();
            assertThat(cc.getEscalationLevel()).isEqualTo(1);
            assertThat(cc.getStatus()).isEqualTo(CollectionCaseStatus.ESCALATED);

            cc.escalate();
            assertThat(cc.getEscalationLevel()).isEqualTo(2);
            assertThat(cc.getStatus()).isEqualTo(CollectionCaseStatus.ESCALATED);

            cc.escalate();
            assertThat(cc.getEscalationLevel()).isEqualTo(3);
            assertThat(cc.getStatus()).isEqualTo(CollectionCaseStatus.LEGAL);
        }
    }
}
