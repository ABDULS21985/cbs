package com.cbs.unit.channel;

import com.cbs.account.repository.TransactionJournalRepository;
import com.cbs.common.guard.SyntheticCapabilityGuard;
import com.cbs.casemgmt.entity.CustomerCase;
import com.cbs.casemgmt.repository.CaseNoteRepository;
import com.cbs.casemgmt.repository.CustomerCaseRepository;
import com.cbs.casemgmt.service.CaseManagementService;
import com.cbs.common.exception.BusinessException;
import com.cbs.loyalty.entity.LoyaltyAccount;
import com.cbs.loyalty.entity.LoyaltyProgram;
import com.cbs.loyalty.entity.LoyaltyTransaction;
import com.cbs.loyalty.repository.LoyaltyAccountRepository;
import com.cbs.loyalty.repository.LoyaltyProgramRepository;
import com.cbs.loyalty.repository.LoyaltyTransactionRepository;
import com.cbs.loyalty.service.LoyaltyService;
import com.cbs.pfm.entity.PfmSnapshot;
import com.cbs.pfm.repository.PfmBudgetRepository;
import com.cbs.pfm.repository.PfmFinancialHealthRepository;
import com.cbs.pfm.repository.PfmSnapshotRepository;
import com.cbs.pfm.repository.PfmSpendingCategoryRepository;
import com.cbs.pfm.service.PfmService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Channel Experience - Case Management, Loyalty & PFM")
class ChannelExperienceTest {

    // ── Case Management ─────────────────────────────────────────

    @Nested
    @DisplayName("Case Management Service")
    class CaseManagementTests {

        @Mock private CustomerCaseRepository caseRepository;
        @Mock private CaseNoteRepository noteRepository;
        @InjectMocks private CaseManagementService caseManagementService;

        @Test
        @DisplayName("createCase sets OPEN status, generates case number, and computes SLA due date")
        void createCase_setsStatusAndSlaDue() {
            CustomerCase input = CustomerCase.builder()
                    .customerId(100L).caseType("COMPLAINT").caseCategory("SERVICE")
                    .priority("HIGH").subject("Overcharged fee").build();

            when(caseRepository.save(any(CustomerCase.class))).thenAnswer(inv -> {
                CustomerCase c = inv.getArgument(0);
                c.setId(1L);
                return c;
            });

            CustomerCase result = caseManagementService.createCase(input);

            assertThat(result.getStatus()).isEqualTo("OPEN");
            assertThat(result.getCaseNumber()).startsWith("CASE-");
            assertThat(result.getSlaDueAt()).isNotNull();
            verify(caseRepository).save(any(CustomerCase.class));
        }

        @Test
        @DisplayName("assignCase transitions status to IN_PROGRESS and sets assignee")
        void assignCase_setsInProgressAndAssignee() {
            CustomerCase existing = CustomerCase.builder()
                    .id(1L).caseNumber("CASE-ABC123").status("OPEN")
                    .customerId(100L).caseType("INQUIRY").caseCategory("GENERAL")
                    .priority("MEDIUM").subject("Balance inquiry").build();

            when(caseRepository.findByCaseNumber("CASE-ABC123")).thenReturn(Optional.of(existing));
            when(caseRepository.save(any(CustomerCase.class))).thenAnswer(inv -> inv.getArgument(0));

            CustomerCase result = caseManagementService.assignCase("CASE-ABC123", "agent01", "SUPPORT_TEAM");

            assertThat(result.getStatus()).isEqualTo("IN_PROGRESS");
            assertThat(result.getAssignedTo()).isEqualTo("agent01");
            assertThat(result.getAssignedTeam()).isEqualTo("SUPPORT_TEAM");
        }

        @Test
        @DisplayName("resolveCase throws BusinessException when case is already resolved")
        void resolveCase_alreadyResolved_throwsException() {
            CustomerCase resolved = CustomerCase.builder()
                    .id(1L).caseNumber("CASE-DONE01").status("RESOLVED")
                    .customerId(100L).caseType("COMPLAINT").caseCategory("SERVICE")
                    .priority("LOW").subject("Resolved issue").build();

            when(caseRepository.findByCaseNumber("CASE-DONE01")).thenReturn(Optional.of(resolved));

            assertThatThrownBy(() -> caseManagementService.resolveCase(
                    "CASE-DONE01", "Already fixed", "PERMANENT_FIX", "Config error"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("already resolved/closed");
        }

        @Test
        @DisplayName("checkSlaBreaches marks breached cases and returns count")
        void checkSlaBreaches_marksBreachedCases() {
            CustomerCase breach1 = CustomerCase.builder().id(1L).slaBreached(false).build();
            CustomerCase breach2 = CustomerCase.builder().id(2L).slaBreached(false).build();

            when(caseRepository.findSlaBreachCandidates()).thenReturn(List.of(breach1, breach2));
            when(caseRepository.save(any(CustomerCase.class))).thenAnswer(inv -> inv.getArgument(0));

            int count = caseManagementService.checkSlaBreaches();

            assertThat(count).isEqualTo(2);
            assertThat(breach1.getSlaBreached()).isTrue();
            assertThat(breach2.getSlaBreached()).isTrue();
            verify(caseRepository, times(2)).save(any(CustomerCase.class));
        }
    }

    // ── Loyalty Service ─────────────────────────────────────────

    @Nested
    @DisplayName("Loyalty Service")
    class LoyaltyTests {

        @Mock private LoyaltyProgramRepository programRepository;
        @Mock private LoyaltyAccountRepository accountRepository;
        @Mock private LoyaltyTransactionRepository transactionRepository;
        @InjectMocks private LoyaltyService loyaltyService;

        @Test
        @DisplayName("earnPoints increases current balance and lifetime earned")
        void earnPoints_increasesBalanceAndLifetime() {
            LoyaltyAccount account = LoyaltyAccount.builder()
                    .id(10L).loyaltyNumber("LYL-EARN0001").customerId(200L)
                    .programId(1L).currentBalance(500).lifetimeEarned(2000)
                    .status("ACTIVE").build();

            when(accountRepository.findByLoyaltyNumber("LYL-EARN0001")).thenReturn(Optional.of(account));
            when(transactionRepository.save(any(LoyaltyTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountRepository.save(any(LoyaltyAccount.class))).thenAnswer(inv -> inv.getArgument(0));

            LoyaltyAccount result = loyaltyService.earnPoints("LYL-EARN0001", 150, "Purchase reward", 999L);

            assertThat(result.getCurrentBalance()).isEqualTo(650);
            assertThat(result.getLifetimeEarned()).isEqualTo(2150);
            verify(transactionRepository).save(argThat(txn ->
                    "EARN".equals(txn.getTransactionType()) && txn.getPoints() == 150));
        }

        @Test
        @DisplayName("redeemPoints throws BusinessException when balance is insufficient")
        void redeemPoints_insufficientBalance_throwsException() {
            LoyaltyAccount account = LoyaltyAccount.builder()
                    .id(11L).loyaltyNumber("LYL-LOW00001").customerId(200L)
                    .programId(1L).currentBalance(300).status("ACTIVE").build();
            LoyaltyProgram program = LoyaltyProgram.builder()
                    .id(1L).programCode("LPG-REWARDS").minRedemptionPoints(100).build();

            when(accountRepository.findByLoyaltyNumber("LYL-LOW00001")).thenReturn(Optional.of(account));
            when(programRepository.findById(1L)).thenReturn(Optional.of(program));

            assertThatThrownBy(() -> loyaltyService.redeemPoints("LYL-LOW00001", 500, "Gift card redemption"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient points");
        }

        @Test
        @DisplayName("redeemPoints deducts balance and records REDEEM transaction on success")
        void redeemPoints_success_deductsAndRecords() {
            LoyaltyAccount account = LoyaltyAccount.builder()
                    .id(12L).loyaltyNumber("LYL-RDEEM001").customerId(200L)
                    .programId(1L).currentBalance(5000).lifetimeRedeemed(1000)
                    .status("ACTIVE").build();
            LoyaltyProgram program = LoyaltyProgram.builder()
                    .id(1L).programCode("LPG-REWARDS").minRedemptionPoints(100).build();

            when(accountRepository.findByLoyaltyNumber("LYL-RDEEM001")).thenReturn(Optional.of(account));
            when(programRepository.findById(1L)).thenReturn(Optional.of(program));
            when(transactionRepository.save(any(LoyaltyTransaction.class))).thenAnswer(inv -> inv.getArgument(0));
            when(accountRepository.save(any(LoyaltyAccount.class))).thenAnswer(inv -> inv.getArgument(0));

            LoyaltyAccount result = loyaltyService.redeemPoints("LYL-RDEEM001", 2000, "Flight booking");

            assertThat(result.getCurrentBalance()).isEqualTo(3000);
            assertThat(result.getLifetimeRedeemed()).isEqualTo(3000);
            verify(transactionRepository).save(argThat(txn ->
                    "REDEEM".equals(txn.getTransactionType()) && txn.getPoints() == -2000));
        }
    }

    // ── PFM Service ─────────────────────────────────────────────

    @Nested
    @DisplayName("PFM Service")
    class PfmTests {

        @Mock private PfmSnapshotRepository snapshotRepository;
        @Mock private PfmBudgetRepository budgetRepository;
        @Mock private PfmFinancialHealthRepository healthRepository;
        @Mock private PfmSpendingCategoryRepository categoryRepository;
        @Mock private TransactionJournalRepository transactionJournalRepository;
        @InjectMocks private PfmService pfmService;

        @BeforeEach
        void setUp() {
            SyntheticCapabilityGuard.enableSyntheticServicesForTesting();
        }

        @Test
        @DisplayName("generateSnapshot creates snapshot with calculated fields for customer")
        void generateSnapshot_createsWithCalculatedFields() {
            when(transactionJournalRepository.aggregatePostedCreditsAndDebitsByCustomer(eq(300L), any(), any()))
                    .thenReturn(new Object[]{java.math.BigDecimal.valueOf(50000), java.math.BigDecimal.valueOf(30000)});
            when(transactionJournalRepository.aggregatePostedDebitCategoriesByCustomer(eq(300L), any(), any()))
                    .thenReturn(List.of());
            when(snapshotRepository.save(any(PfmSnapshot.class))).thenAnswer(inv -> {
                PfmSnapshot s = inv.getArgument(0);
                s.setId(1L);
                return s;
            });

            PfmSnapshot result = pfmService.generateSnapshot(300L, "MONTHLY");

            assertThat(result.getCustomerId()).isEqualTo(300L);
            assertThat(result.getSnapshotType()).isEqualTo("MONTHLY");
            assertThat(result.getTotalIncome()).isNotNull();
            assertThat(result.getTotalExpenses()).isNotNull();
            assertThat(result.getSavingsRate()).isNotNull();
            assertThat(result.getFinancialHealthScore()).isBetween(0, 100);
            assertThat(result.getExpenseBreakdown()).isNull();
            verify(snapshotRepository).save(any(PfmSnapshot.class));
        }
    }
}
