package com.cbs.unit.operational;

import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import com.cbs.accountsreceivable.repository.ReceivableInvoiceRepository;
import com.cbs.accountsreceivable.service.ReceivableInvoiceService;
import com.cbs.cardswitch.entity.CardSwitchTransaction;
import com.cbs.cardswitch.repository.CardSwitchTransactionRepository;
import com.cbs.cardswitch.service.CardSwitchService;
import com.cbs.common.exception.BusinessException;
import com.cbs.issueddevice.entity.IssuedDevice;
import com.cbs.issueddevice.repository.IssuedDeviceRepository;
import com.cbs.issueddevice.service.IssuedDeviceService;
import com.cbs.openitem.entity.OpenItem;
import com.cbs.openitem.repository.OpenItemRepository;
import com.cbs.openitem.service.OpenItemService;
import com.cbs.positionmgmt.entity.FinancialPosition;
import com.cbs.positionmgmt.repository.FinancialPositionRepository;
import com.cbs.positionmgmt.service.FinancialPositionService;
import com.cbs.productinventory.entity.ProductInventoryItem;
import com.cbs.productinventory.repository.ProductInventoryItemRepository;
import com.cbs.productinventory.service.ProductInventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OperationalServiceTest {

    // ========================================================================
    // OpenItemService - Aging Calculation Tests
    // ========================================================================

    @Nested
    @DisplayName("OpenItemService - Aging Calculation Tests")
    @ExtendWith(MockitoExtension.class)
    class OpenItemAgingTests {

        @Mock private OpenItemRepository repository;

        @InjectMocks private OpenItemService openItemService;

        @Test
        @DisplayName("updateAging recalculates aging days based on value date for all open items")
        void updateAging_recalculatesDaysForOpenItems() {
            OpenItem item1 = OpenItem.builder()
                    .id(1L).itemCode("OI-AAAA").itemType("BREAK").itemCategory("RECONCILIATION")
                    .description("Unmatched entry").amount(new BigDecimal("5000.00"))
                    .valueDate(LocalDate.now().minusDays(15)).agingDays(0).status("OPEN")
                    .build();
            OpenItem item2 = OpenItem.builder()
                    .id(2L).itemCode("OI-BBBB").itemType("SUSPENSE").itemCategory("ACCOUNTING")
                    .description("Suspense item").amount(new BigDecimal("12000.00"))
                    .valueDate(LocalDate.now().minusDays(45)).agingDays(0).status("INVESTIGATING")
                    .build();

            when(repository.findByStatusInOrderByAgingDaysDesc(
                    List.of("OPEN", "INVESTIGATING", "ESCALATED", "PENDING_APPROVAL")))
                    .thenReturn(List.of(item1, item2));
            when(repository.save(any(OpenItem.class))).thenAnswer(inv -> inv.getArgument(0));

            int count = openItemService.updateAging();

            assertThat(count).isEqualTo(2);
            assertThat(item1.getAgingDays()).isEqualTo(15);
            assertThat(item2.getAgingDays()).isEqualTo(45);
            verify(repository, times(2)).save(any(OpenItem.class));
        }
    }

    // ========================================================================
    // ReceivableInvoiceService - Partial and Full Payment Tests
    // ========================================================================

    @Nested
    @DisplayName("ReceivableInvoiceService - Payment Tests")
    @ExtendWith(MockitoExtension.class)
    class ReceivableInvoicePaymentTests {

        @Mock private ReceivableInvoiceRepository repository;

        @InjectMocks private ReceivableInvoiceService receivableInvoiceService;

        private ReceivableInvoice issuedInvoice;

        @BeforeEach
        void setUp() {
            issuedInvoice = ReceivableInvoice.builder()
                    .id(1L).invoiceNumber("INV-TEST001").customerId(100L)
                    .invoiceType("SERVICE").currency("USD")
                    .grossAmount(new BigDecimal("10000.00"))
                    .taxAmount(BigDecimal.ZERO)
                    .netAmount(new BigDecimal("10000.00"))
                    .paidAmount(BigDecimal.ZERO)
                    .outstandingAmount(new BigDecimal("10000.00"))
                    .dueDate(LocalDate.now().plusDays(30))
                    .status("ISSUED")
                    .build();
        }

        @Test
        @DisplayName("recordPayment with partial amount sets status to PARTIALLY_PAID and updates outstanding")
        void recordPayment_partialPaymentSetsPartiallyPaid() {
            when(repository.findByInvoiceNumber("INV-TEST001")).thenReturn(Optional.of(issuedInvoice));
            when(repository.save(any(ReceivableInvoice.class))).thenAnswer(inv -> inv.getArgument(0));

            ReceivableInvoice result = receivableInvoiceService.recordPayment("INV-TEST001", new BigDecimal("4000.00"));

            assertThat(result.getStatus()).isEqualTo("PARTIALLY_PAID");
            assertThat(result.getPaidAmount()).isEqualByComparingTo(new BigDecimal("4000.00"));
            assertThat(result.getOutstandingAmount()).isEqualByComparingTo(new BigDecimal("6000.00"));
            verify(repository).save(any(ReceivableInvoice.class));
        }

        @Test
        @DisplayName("recordPayment with full amount sets status to PAID and zeros outstanding")
        void recordPayment_fullPaymentSetsPaid() {
            when(repository.findByInvoiceNumber("INV-TEST001")).thenReturn(Optional.of(issuedInvoice));
            when(repository.save(any(ReceivableInvoice.class))).thenAnswer(inv -> inv.getArgument(0));

            ReceivableInvoice result = receivableInvoiceService.recordPayment("INV-TEST001", new BigDecimal("10000.00"));

            assertThat(result.getStatus()).isEqualTo("PAID");
            assertThat(result.getOutstandingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(result.getPaidAt()).isNotNull();
            verify(repository).save(any(ReceivableInvoice.class));
        }
    }

    // ========================================================================
    // ProductInventoryService - Stock Management Tests
    // ========================================================================

    @Nested
    @DisplayName("ProductInventoryService - Stock Management Tests")
    @ExtendWith(MockitoExtension.class)
    class ProductInventoryStockTests {

        @Mock private ProductInventoryItemRepository repository;

        @InjectMocks private ProductInventoryService productInventoryService;

        private ProductInventoryItem inventoryItem;

        @BeforeEach
        void setUp() {
            inventoryItem = ProductInventoryItem.builder()
                    .id(1L).itemCode("PI-CARD001").itemType("CARD_STOCK")
                    .itemName("Visa Debit Cards").branchId(10L)
                    .totalStock(500).allocatedStock(100).availableStock(400)
                    .reorderLevel(50).reorderQuantity(200)
                    .unitCost(new BigDecimal("3.50")).status("ACTIVE")
                    .build();
        }

        @Test
        @DisplayName("issue reduces available stock, increases allocated stock, and recalculates status")
        void issue_reducesAvailableAndIncreasesAllocated() {
            when(repository.findByItemCode("PI-CARD001")).thenReturn(Optional.of(inventoryItem));
            when(repository.save(any(ProductInventoryItem.class))).thenAnswer(inv -> inv.getArgument(0));

            ProductInventoryItem result = productInventoryService.issue("PI-CARD001", 50);

            assertThat(result.getAvailableStock()).isEqualTo(350);
            assertThat(result.getAllocatedStock()).isEqualTo(150);
            assertThat(result.getLastIssuedAt()).isNotNull();
            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            verify(repository).save(any(ProductInventoryItem.class));
        }

        @Test
        @DisplayName("issue throws BusinessException when requested quantity exceeds available stock")
        void issue_throwsWhenInsufficientStock() {
            when(repository.findByItemCode("PI-CARD001")).thenReturn(Optional.of(inventoryItem));

            assertThatThrownBy(() -> productInventoryService.issue("PI-CARD001", 500))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Insufficient stock");
        }
    }

    // ========================================================================
    // IssuedDeviceService - Activation Guard Rail Tests
    // ========================================================================

    @Nested
    @DisplayName("IssuedDeviceService - Activation Guard Rail Tests")
    @ExtendWith(MockitoExtension.class)
    class IssuedDeviceActivationTests {

        @Mock private IssuedDeviceRepository repository;

        @InjectMocks private IssuedDeviceService issuedDeviceService;

        @Test
        @DisplayName("activate transitions INACTIVE device to ACTIVE with activation timestamp")
        void activate_transitionsInactiveToActive() {
            IssuedDevice device = IssuedDevice.builder()
                    .id(1L).deviceCode("DEV-TOKEN001").customerId(200L)
                    .deviceType("TOKEN").deviceIdentifier("SN-12345")
                    .linkedAccountId(500L).issuedBranchId(10L)
                    .activationStatus("INACTIVE")
                    .build();

            when(repository.findByDeviceCode("DEV-TOKEN001")).thenReturn(Optional.of(device));
            when(repository.save(any(IssuedDevice.class))).thenAnswer(inv -> inv.getArgument(0));

            IssuedDevice result = issuedDeviceService.activate("DEV-TOKEN001");

            assertThat(result.getActivationStatus()).isEqualTo("ACTIVE");
            assertThat(result.getActivatedAt()).isNotNull();
            verify(repository).save(any(IssuedDevice.class));
        }

        @Test
        @DisplayName("activate rejects device that is not INACTIVE (guard rail)")
        void activate_rejectsNonInactiveDevice() {
            IssuedDevice blockedDevice = IssuedDevice.builder()
                    .id(2L).deviceCode("DEV-BLOCKED01").customerId(200L)
                    .deviceType("CARD").activationStatus("BLOCKED")
                    .build();

            when(repository.findByDeviceCode("DEV-BLOCKED01")).thenReturn(Optional.of(blockedDevice));

            assertThatThrownBy(() -> issuedDeviceService.activate("DEV-BLOCKED01"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("must be INACTIVE to activate");
        }

        @Test
        @DisplayName("unblock transitions BLOCKED device to ACTIVE")
        void unblock_transitionsBlockedToActive() {
            IssuedDevice blocked = IssuedDevice.builder()
                    .id(3L).deviceCode("DEV-UNBLOCK01").customerId(200L)
                    .deviceType("TOKEN").activationStatus("BLOCKED")
                    .build();

            when(repository.findByDeviceCode("DEV-UNBLOCK01")).thenReturn(Optional.of(blocked));
            when(repository.save(any(IssuedDevice.class))).thenAnswer(inv -> inv.getArgument(0));

            IssuedDevice result = issuedDeviceService.unblock("DEV-UNBLOCK01");

            assertThat(result.getActivationStatus()).isEqualTo("ACTIVE");
            verify(repository).save(any(IssuedDevice.class));
        }

        @Test
        @DisplayName("unblock rejects device that is not BLOCKED")
        void unblock_rejectsNonBlockedDevice() {
            IssuedDevice active = IssuedDevice.builder()
                    .id(4L).deviceCode("DEV-ACTIVE01").customerId(200L)
                    .deviceType("CARD").activationStatus("ACTIVE")
                    .build();

            when(repository.findByDeviceCode("DEV-ACTIVE01")).thenReturn(Optional.of(active));

            assertThatThrownBy(() -> issuedDeviceService.unblock("DEV-ACTIVE01"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("must be BLOCKED to unblock");
        }
    }

    // ========================================================================
    // CardSwitchService - Declined Detection Tests
    // ========================================================================

    @Nested
    @DisplayName("CardSwitchService - Declined Detection Tests")
    @ExtendWith(MockitoExtension.class)
    class CardSwitchDeclinedTests {

        @Mock private CardSwitchTransactionRepository repository;

        @InjectMocks private CardSwitchService cardSwitchService;

        @Test
        @DisplayName("processTransaction marks transaction as declined when response code is not 00")
        void processTransaction_marksDeclinedForNon00ResponseCode() {
            CardSwitchTransaction txn = CardSwitchTransaction.builder()
                    .transactionType("PURCHASE").cardHash("abc123hash")
                    .cardScheme("VISA").merchantId("MERCH-001")
                    .merchantName("Test Store").amount(new BigDecimal("250.00"))
                    .currency("USD").responseCode("51")
                    .declineReason("Insufficient funds")
                    .build();

            when(repository.save(any(CardSwitchTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

            CardSwitchTransaction result = cardSwitchService.processTransaction(txn);

            assertThat(result.getIsDeclined()).isTrue();
            assertThat(result.getSwitchRef()).startsWith("CSW-");
            assertThat(result.getProcessedAt()).isNotNull();
            verify(repository).save(any(CardSwitchTransaction.class));
        }
    }

    // ========================================================================
    // FinancialPositionService - Limit Breach Tests
    // ========================================================================

    @Nested
    @DisplayName("FinancialPositionService - Limit Breach Tests")
    @ExtendWith(MockitoExtension.class)
    @org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
    class FinancialPositionLimitTests {

        @Mock private FinancialPositionRepository repository;
        @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;

        @InjectMocks private FinancialPositionService financialPositionService;

        @Test
        @DisplayName("record flags limit breach when net position exceeds position limit")
        void record_flagsLimitBreachWhenExceedingLimit() {
            FinancialPosition pos = FinancialPosition.builder()
                    .positionType("FX").positionCategory("TRADING")
                    .identifier("USD/EUR").identifierName("Dollar Euro Pair")
                    .currency("USD")
                    .longPosition(new BigDecimal("8000000.00"))
                    .shortPosition(new BigDecimal("2000000.00"))
                    .positionLimit(new BigDecimal("5000000.00"))
                    .positionDate(LocalDate.now())
                    .build();

            when(repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc("FX", LocalDate.now()))
                    .thenReturn(java.util.List.of());
            when(repository.save(any(FinancialPosition.class))).thenAnswer(inv -> inv.getArgument(0));

            FinancialPosition result = financialPositionService.record(pos);

            // net = 8M - 2M = 6M, limit = 5M => breach
            assertThat(result.getNetPosition()).isEqualByComparingTo(new BigDecimal("6000000.00"));
            assertThat(result.getLimitBreach()).isTrue();
            assertThat(result.getLimitUtilizationPct().compareTo(new BigDecimal("100"))).isGreaterThan(0);
            assertThat(result.getPositionCode()).startsWith("FP-");
            verify(repository).save(any(FinancialPosition.class));
        }

        @Test
        @DisplayName("record does not flag breach when net position is within limit")
        void record_noBreachWhenWithinLimit() {
            FinancialPosition pos = FinancialPosition.builder()
                    .positionType("IR").positionCategory("BANKING_BOOK")
                    .identifier("NGN-BOND-5Y").identifierName("Nigeria 5Y Bond")
                    .currency("NGN")
                    .longPosition(new BigDecimal("3000000.00"))
                    .shortPosition(new BigDecimal("1000000.00"))
                    .positionLimit(new BigDecimal("10000000.00"))
                    .positionDate(LocalDate.now())
                    .build();

            when(repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc("IR", LocalDate.now()))
                    .thenReturn(java.util.List.of());
            when(repository.save(any(FinancialPosition.class))).thenAnswer(inv -> inv.getArgument(0));

            FinancialPosition result = financialPositionService.record(pos);

            // net = 3M - 1M = 2M, limit = 10M => no breach
            assertThat(result.getNetPosition()).isEqualByComparingTo(new BigDecimal("2000000.00"));
            assertThat(result.getLimitBreach()).isFalse();
            assertThat(result.getLimitUtilizationPct().compareTo(new BigDecimal("100"))).isLessThan(0);
            verify(repository).save(any(FinancialPosition.class));
        }
    }
}
