package com.cbs.unit.cashmgmt;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.bankdraft.entity.BankDraft;
import com.cbs.bankdraft.repository.BankDraftRepository;
import com.cbs.bankdraft.service.BankDraftService;
import com.cbs.cashpool.entity.CashPoolParticipant;
import com.cbs.cashpool.entity.CashPoolStructure;
import com.cbs.cashpool.entity.CashPoolSweepLog;
import com.cbs.cashpool.repository.CashPoolParticipantRepository;
import com.cbs.cashpool.repository.CashPoolStructureRepository;
import com.cbs.cashpool.repository.CashPoolSweepLogRepository;
import com.cbs.cashpool.service.CashPoolService;
import com.cbs.centralcashhandling.entity.CashMovement;
import com.cbs.centralcashhandling.entity.CashVault;
import com.cbs.centralcashhandling.repository.CashMovementRepository;
import com.cbs.centralcashhandling.repository.CashVaultRepository;
import com.cbs.centralcashhandling.service.CentralCashHandlingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.payroll.entity.PayrollBatch;
import com.cbs.payroll.entity.PayrollItem;
import com.cbs.payroll.repository.PayrollBatchRepository;
import com.cbs.payroll.repository.PayrollItemRepository;
import com.cbs.payroll.service.PayrollService;
import com.cbs.lockbox.entity.Lockbox;
import com.cbs.lockbox.entity.LockboxItem;
import com.cbs.lockbox.repository.LockboxItemRepository;
import com.cbs.lockbox.repository.LockboxRepository;
import com.cbs.lockbox.service.LockboxService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CashManagementTest {

    // ========================================================================
    // CashPoolService - Sweep Operation Tests
    // ========================================================================

    @Nested
    @DisplayName("CashPoolService - Sweep Operation Tests")
    @ExtendWith(MockitoExtension.class)
    class CashPoolSweepTests {

        @Mock private CashPoolStructureRepository poolRepository;
        @Mock private CashPoolParticipantRepository participantRepository;
        @Mock private CashPoolSweepLogRepository sweepLogRepository;
        @Mock private AccountRepository accountRepository;

        @InjectMocks private CashPoolService cashPoolService;

        @Test
        @DisplayName("executeSweep generates sweep logs for active pool participants excluding header")
        void executeSweep_generatesLogsForParticipantsExcludingHeader() {
            CashPoolStructure pool = CashPoolStructure.builder()
                    .id(1L).poolCode("CPL-SWEEP001").poolName("Corp Zero Balance Pool")
                    .poolType("ZERO_BALANCE").headerAccountId(100L).customerId(50L)
                    .currency("USD").sweepFrequency("DAILY")
                    .minSweepAmount(BigDecimal.ZERO).isActive(true)
                    .intercompanyLoan(false)
                    .build();

            CashPoolParticipant header = CashPoolParticipant.builder()
                    .id(1L).poolId(1L).accountId(100L).participantName("Header Account")
                    .participantRole("HEADER").targetBalance(BigDecimal.ZERO)
                    .priority(1).isActive(true)
                    .build();

            CashPoolParticipant participant = CashPoolParticipant.builder()
                    .id(2L).poolId(1L).accountId(200L).participantName("Sub Account A")
                    .participantRole("PARTICIPANT").targetBalance(new BigDecimal("50000.00"))
                    .priority(10).isActive(true)
                    .build();

            when(poolRepository.findByPoolCode("CPL-SWEEP001")).thenReturn(Optional.of(pool));
            when(participantRepository.findByPoolIdAndIsActiveTrueOrderByPriorityAsc(1L))
                    .thenReturn(List.of(header, participant));
            when(accountRepository.findById(200L))
                    .thenReturn(Optional.of(Account.builder().availableBalance(new BigDecimal("85000.00")).build()));
            when(sweepLogRepository.save(any(CashPoolSweepLog.class))).thenAnswer(inv -> inv.getArgument(0));

            List<CashPoolSweepLog> logs = cashPoolService.executeSweep("CPL-SWEEP001");

            // Header is skipped; only participant generates a sweep log
            assertThat(logs).hasSize(1);
            assertThat(logs.get(0).getSweepType()).isEqualTo("ZERO_BALANCE");
            verify(sweepLogRepository, atLeastOnce()).save(any(CashPoolSweepLog.class));
        }

        @Test
        @DisplayName("executeSweep throws BusinessException for inactive pool")
        void executeSweep_throwsForInactivePool() {
            CashPoolStructure inactivePool = CashPoolStructure.builder()
                    .id(2L).poolCode("CPL-INACTIVE").poolName("Inactive Pool")
                    .poolType("ZERO_BALANCE").headerAccountId(100L).customerId(50L)
                    .isActive(false)
                    .build();

            when(poolRepository.findByPoolCode("CPL-INACTIVE")).thenReturn(Optional.of(inactivePool));

            assertThatThrownBy(() -> cashPoolService.executeSweep("CPL-INACTIVE"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not active");
        }
    }

    // ========================================================================
    // PayrollService - Batch Processing Tests
    // ========================================================================

    @Nested
    @DisplayName("PayrollService - Batch Processing Tests")
    @ExtendWith(MockitoExtension.class)
    @MockitoSettings(strictness = Strictness.LENIENT)
    class PayrollBatchTests {

        @Mock private PayrollBatchRepository batchRepository;
        @Mock private PayrollItemRepository itemRepository;
        @Mock private CurrentActorProvider currentActorProvider;

        @InjectMocks private PayrollService payrollService;

        @Test
        @DisplayName("createBatch calculates totals from items and sets DRAFT status")
        void createBatch_calculatesTotalsAndSetsDraft() {
            PayrollBatch batch = PayrollBatch.builder()
                    .customerId(100L).companyName("Acme Corp").debitAccountId(500L)
                    .payrollType("MONTHLY").currency("NGN")
                    .payPeriodStart(LocalDate.of(2026, 3, 1))
                    .payPeriodEnd(LocalDate.of(2026, 3, 31))
                    .paymentDate(LocalDate.of(2026, 3, 25))
                    .totalGross(BigDecimal.ZERO).totalNet(BigDecimal.ZERO)
                    .totalTax(BigDecimal.ZERO).employeeCount(0)
                    .build();

            PayrollItem item1 = PayrollItem.builder()
                    .employeeId("EMP-001").employeeName("Alice Smith")
                    .creditAccountNumber("0012345678").creditBankCode("058")
                    .grossAmount(new BigDecimal("500000.00"))
                    .taxAmount(new BigDecimal("50000.00"))
                    .netAmount(new BigDecimal("450000.00"))
                    .build();

            PayrollItem item2 = PayrollItem.builder()
                    .employeeId("EMP-002").employeeName("Bob Jones")
                    .creditAccountNumber("0098765432").creditBankCode("058")
                    .grossAmount(new BigDecimal("600000.00"))
                    .taxAmount(new BigDecimal("70000.00"))
                    .netAmount(new BigDecimal("530000.00"))
                    .build();

            when(batchRepository.save(any(PayrollBatch.class))).thenAnswer(inv -> {
                PayrollBatch b = inv.getArgument(0);
                b.setId(1L);
                return b;
            });
            when(itemRepository.save(any(PayrollItem.class))).thenAnswer(inv -> inv.getArgument(0));

            PayrollBatch result = payrollService.createBatch(batch, List.of(item1, item2));

            assertThat(result.getStatus()).isEqualTo("DRAFT");
            assertThat(result.getEmployeeCount()).isEqualTo(2);
            assertThat(result.getTotalGross()).isEqualByComparingTo(new BigDecimal("1100000.00"));
            assertThat(result.getTotalNet()).isEqualByComparingTo(new BigDecimal("980000.00"));
            assertThat(result.getTotalTax()).isEqualByComparingTo(new BigDecimal("120000.00"));
            assertThat(result.getBatchId()).startsWith("PAY-");
            verify(batchRepository).save(any(PayrollBatch.class));
            verify(itemRepository, times(2)).save(any(PayrollItem.class));
        }

        @Test
        @DisplayName("approve rejects batch that is not in VALIDATED status")
        void approve_rejectsNonValidatedBatch() {
            when(currentActorProvider.getCurrentActor()).thenReturn("manager1");
            PayrollBatch draftBatch = PayrollBatch.builder()
                    .id(1L).batchId("PAY-DRAFT001").customerId(100L)
                    .companyName("Acme Corp").debitAccountId(500L)
                    .payrollType("MONTHLY").currency("NGN")
                    .payPeriodStart(LocalDate.of(2026, 3, 1))
                    .payPeriodEnd(LocalDate.of(2026, 3, 31))
                    .paymentDate(LocalDate.of(2026, 3, 25))
                    .totalGross(new BigDecimal("1100000.00"))
                    .totalNet(new BigDecimal("980000.00"))
                    .employeeCount(2).status("DRAFT")
                    .build();

            when(batchRepository.findByBatchId("PAY-DRAFT001")).thenReturn(Optional.of(draftBatch));

            assertThatThrownBy(() -> payrollService.approve("PAY-DRAFT001"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("VALIDATED");
        }
    }

    // ========================================================================
    // CentralCashHandlingService - Vault Movement Tests
    // ========================================================================

    @Nested
    @DisplayName("CentralCashHandlingService - Vault Movement Tests")
    @ExtendWith(MockitoExtension.class)
    class CentralCashVaultTests {

        @Mock private CashVaultRepository vaultRepository;
        @Mock private CashMovementRepository movementRepository;

        @InjectMocks private CentralCashHandlingService centralCashHandlingService;

        @Test
        @DisplayName("recordMovement debits source vault and credits destination vault balances")
        void recordMovement_debitsSourceAndCreditsDestination() {
            CashVault sourceVault = CashVault.builder()
                    .id(1L).vaultCode("VLT-MAIN001").vaultName("Main Vault")
                    .vaultType("MAIN").currency("NGN")
                    .totalBalance(new BigDecimal("50000000.00")).status("ACTIVE")
                    .build();

            CashVault destVault = CashVault.builder()
                    .id(2L).vaultCode("VLT-BRANCH01").vaultName("Branch Vault")
                    .vaultType("BRANCH").currency("NGN")
                    .totalBalance(new BigDecimal("5000000.00")).status("ACTIVE")
                    .build();

            CashMovement movement = CashMovement.builder()
                    .fromVaultCode("VLT-MAIN001").toVaultCode("VLT-BRANCH01")
                    .movementType("REPLENISHMENT").currency("NGN")
                    .amount(new BigDecimal("10000000.00"))
                    .scheduledDate(LocalDate.now()).status("SCHEDULED")
                    .build();

            when(vaultRepository.findByVaultCode("VLT-MAIN001")).thenReturn(Optional.of(sourceVault));
            when(vaultRepository.findByVaultCode("VLT-BRANCH01")).thenReturn(Optional.of(destVault));
            when(vaultRepository.save(any(CashVault.class))).thenAnswer(inv -> inv.getArgument(0));
            when(movementRepository.save(any(CashMovement.class))).thenAnswer(inv -> inv.getArgument(0));

            CashMovement result = centralCashHandlingService.recordMovement(movement);

            assertThat(result.getMovementRef()).startsWith("CMV-");
            assertThat(sourceVault.getTotalBalance()).isEqualByComparingTo(new BigDecimal("40000000.00"));
            assertThat(destVault.getTotalBalance()).isEqualByComparingTo(new BigDecimal("15000000.00"));
            verify(vaultRepository, times(2)).save(any(CashVault.class));
            verify(movementRepository).save(any(CashMovement.class));
        }

        @Test
        @DisplayName("confirmDelivery sets status to CONFIRMED and records actual delivery date")
        void confirmDelivery_setsConfirmedStatusAndActualDate() {
            CashMovement movement = CashMovement.builder()
                    .id(1L).movementRef("CMV-DELIVERY01")
                    .fromVaultCode("VLT-MAIN001").toVaultCode("VLT-BRANCH01")
                    .movementType("REPLENISHMENT").currency("NGN")
                    .amount(new BigDecimal("5000000.00"))
                    .scheduledDate(LocalDate.now().minusDays(1))
                    .status("SCHEDULED")
                    .build();

            when(movementRepository.findByMovementRef("CMV-DELIVERY01")).thenReturn(Optional.of(movement));
            when(movementRepository.save(any(CashMovement.class))).thenAnswer(inv -> inv.getArgument(0));

            CashMovement result = centralCashHandlingService.confirmDelivery("CMV-DELIVERY01");

            assertThat(result.getStatus()).isEqualTo("CONFIRMED");
            assertThat(result.getActualDate()).isEqualTo(LocalDate.now());
            verify(movementRepository).save(any(CashMovement.class));
        }
    }

    // ========================================================================
    // LockboxService - Item Processing Tests
    // ========================================================================

    @Nested
    @DisplayName("LockboxService - Item Processing Tests")
    @ExtendWith(MockitoExtension.class)
    class LockboxProcessingTests {

        @Mock private LockboxRepository lockboxRepository;
        @Mock private LockboxItemRepository itemRepository;

        @InjectMocks private LockboxService lockboxService;

        @Test
        @DisplayName("receiveItem with OCR enabled leaves item pending manual review until a real OCR response exists")
        void receiveItem_requiresManualReviewWithoutOcrResponse() {
            Lockbox lockbox = Lockbox.builder()
                    .id(1L).lockboxNumber("LBX-CORP001").customerId(100L)
                    .creditAccountId(500L).lockboxType("STANDARD")
                    .lockboxAddress("123 Main Street").ocrEnabled(true)
                    .autoDeposit(true).isActive(true)
                    .build();

            LockboxItem item = LockboxItem.builder()
                    .chequeNumber("CHQ-90001").drawerName("Paying Customer")
                    .drawerBank("Partner Bank").amount(new BigDecimal("25000.00"))
                    .currency("USD")
                    .build();

            when(lockboxRepository.findByLockboxNumber("LBX-CORP001")).thenReturn(Optional.of(lockbox));
            when(itemRepository.save(any(LockboxItem.class))).thenAnswer(inv -> inv.getArgument(0));

            LockboxItem result = lockboxService.receiveItem("LBX-CORP001", item);

            assertThat(result.getItemReference()).startsWith("LBI-");
            assertThat(result.getStatus()).isEqualTo("OCR_PROCESSED");
            assertThat(result.getOcrConfidence()).isNull();
            assertThat(result.getDepositedAt()).isNull();
            verify(itemRepository).save(any(LockboxItem.class));
        }
    }

    // ========================================================================
    // BankDraftService - Draft Lifecycle Tests
    // ========================================================================

    @Nested
    @DisplayName("BankDraftService - Draft Lifecycle Tests")
    @ExtendWith(MockitoExtension.class)
    class BankDraftLifecycleTests {

        @Mock private BankDraftRepository draftRepository;

        @InjectMocks private BankDraftService bankDraftService;

        @Test
        @DisplayName("issue sets ISSUED status with draft number, issue date, and default expiry")
        void issue_setsIssuedStatusWithDraftNumberAndExpiry() {
            BankDraft draft = BankDraft.builder()
                    .customerId(100L).debitAccountId(500L)
                    .draftType("DEMAND_DRAFT").payeeName("Vendor Corp")
                    .amount(new BigDecimal("150000.00")).currency("NGN")
                    .issueBranchId(10L).deliveryMethod("BRANCH_PICKUP")
                    .build();

            when(draftRepository.save(any(BankDraft.class))).thenAnswer(inv -> inv.getArgument(0));

            BankDraft result = bankDraftService.issue(draft);

            assertThat(result.getDraftNumber()).startsWith("DD-");
            assertThat(result.getStatus()).isEqualTo("ISSUED");
            assertThat(result.getIssueDate()).isEqualTo(LocalDate.now());
            assertThat(result.getExpiryDate()).isEqualTo(LocalDate.now().plusMonths(6));
            assertThat(result.getSerialNumber()).startsWith("SER-");
            verify(draftRepository).save(any(BankDraft.class));
        }

        @Test
        @DisplayName("stopPayment rejects already PAID draft with BusinessException")
        void stopPayment_rejectsPaidDraft() {
            BankDraft paidDraft = BankDraft.builder()
                    .id(1L).draftNumber("DD-PAID001").customerId(100L)
                    .debitAccountId(500L).draftType("DEMAND_DRAFT")
                    .payeeName("Vendor Corp").amount(new BigDecimal("150000.00"))
                    .currency("NGN").status("PAID")
                    .build();

            when(draftRepository.findByDraftNumber("DD-PAID001")).thenReturn(Optional.of(paidDraft));

            assertThatThrownBy(() -> bankDraftService.stopPayment("DD-PAID001", "Customer requested"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Cannot stop a paid draft");
        }
    }
}
