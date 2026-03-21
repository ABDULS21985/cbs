package com.cbs.payroll;

import com.cbs.account.service.AccountService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.payroll.entity.*;
import com.cbs.payroll.repository.*;
import com.cbs.payroll.service.PayrollService;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.service.PaymentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PayrollServiceTest {

    @Mock private PayrollBatchRepository batchRepository;
    @Mock private PayrollItemRepository itemRepository;
    @Mock private PaymentService paymentService;
    @Mock private AccountService accountService;
    @Mock private CurrentActorProvider currentActorProvider;
    @InjectMocks private PayrollService payrollService;

    @Test @DisplayName("Batch must be VALIDATED before approval")
    void approvalRequiresValidation() {
        when(currentActorProvider.getCurrentActor()).thenReturn("admin");
        PayrollBatch batch = PayrollBatch.builder().id(1L).batchId("PAY-TEST").status("DRAFT").build();
        when(batchRepository.findByBatchId("PAY-TEST")).thenReturn(Optional.of(batch));

        assertThatThrownBy(() -> payrollService.approve("PAY-TEST"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("VALIDATED");
    }

    @Test @DisplayName("Approved batch processes all items to PAID")
    void processAllItems() {
        PayrollBatch batch = PayrollBatch.builder()
                .id(1L)
                .batchId("PAY-PROC")
                .debitAccountId(100L)
                .currency("NGN")
                .status("APPROVED")
                .build();
        when(batchRepository.findByBatchId("PAY-PROC")).thenReturn(Optional.of(batch));

        PayrollItem item1 = PayrollItem.builder()
                .id(1L)
                .batchId(1L)
                .employeeName("Alice")
                .creditAccountNumber("1001")
                .netAmount(new BigDecimal("5000"))
                .build();
        PayrollItem item2 = PayrollItem.builder()
                .id(2L)
                .batchId(1L)
                .employeeName("Bob")
                .creditAccountNumber("1002")
                .netAmount(new BigDecimal("6000"))
                .build();
        when(itemRepository.findByBatchIdOrderByEmployeeNameAsc(1L)).thenReturn(List.of(item1, item2));
        when(paymentService.initiateDomesticPayment(anyLong(), anyString(), anyString(), nullable(String.class),
                any(BigDecimal.class), anyString(), anyString(), eq(true)))
                .thenReturn(PaymentInstruction.builder().instructionRef("PAY000000000001").build());
        when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(batchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PayrollBatch result = payrollService.process("PAY-PROC");
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getFailedCount()).isEqualTo(0);
        assertThat(result.getProcessedAt()).isNotNull();
    }

    @Test @DisplayName("Batch creation calculates totals from items")
    void batchTotalsFromItems() {
        when(batchRepository.save(any())).thenAnswer(inv -> { PayrollBatch b = inv.getArgument(0); b.setId(1L); return b; });
        when(itemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PayrollBatch batch = PayrollBatch.builder().customerId(1L).companyName("Test Corp")
                .debitAccountId(100L).payrollType("SALARY").payPeriodStart(LocalDate.of(2026, 3, 1))
                .payPeriodEnd(LocalDate.of(2026, 3, 31)).paymentDate(LocalDate.of(2026, 3, 28)).build();
        List<PayrollItem> items = List.of(
                PayrollItem.builder().employeeId("E001").employeeName("Alice").creditAccountNumber("1001")
                        .grossAmount(new BigDecimal("10000")).taxAmount(new BigDecimal("2000")).netAmount(new BigDecimal("8000")).build(),
                PayrollItem.builder().employeeId("E002").employeeName("Bob").creditAccountNumber("1002")
                        .grossAmount(new BigDecimal("12000")).taxAmount(new BigDecimal("2500")).netAmount(new BigDecimal("9500")).build()
        );

        PayrollBatch result = payrollService.createBatch(batch, items);
        assertThat(result.getTotalGross()).isEqualByComparingTo(new BigDecimal("22000"));
        assertThat(result.getTotalNet()).isEqualByComparingTo(new BigDecimal("17500"));
        assertThat(result.getEmployeeCount()).isEqualTo(2);
        assertThat(result.getBatchId()).startsWith("PAY-");
    }
}
