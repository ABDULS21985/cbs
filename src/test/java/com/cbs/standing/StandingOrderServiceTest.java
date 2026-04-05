package com.cbs.standing;

import com.cbs.account.entity.*;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.config.CbsProperties;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerType;
import com.cbs.payments.islamic.service.IslamicPaymentService;
import com.cbs.payments.repository.PaymentInstructionRepository;
import com.cbs.standing.entity.*;
import com.cbs.standing.repository.*;
import com.cbs.standing.service.StandingOrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StandingOrderServiceTest {

    @Mock private StandingInstructionRepository instructionRepository;
    @Mock private StandingExecutionLogRepository executionLogRepository;
    @Mock private PaymentInstructionRepository paymentRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AccountPostingService accountPostingService;
    @Mock private CbsProperties cbsProperties;
    @Mock private IslamicPaymentService islamicPaymentService;

    @InjectMocks private StandingOrderService standingOrderService;

    private Account account;

    @BeforeEach
    void setUp() {
        Customer c = Customer.builder().id(1L).firstName("Test").lastName("User").customerType(CustomerType.INDIVIDUAL).build();
        account = Account.builder().id(1L).accountNumber("1000000001").customer(c)
                .currencyCode("USD").bookBalance(new BigDecimal("50000")).availableBalance(new BigDecimal("50000"))
                .lienAmount(BigDecimal.ZERO).overdraftLimit(BigDecimal.ZERO)
                .product(Product.builder().id(1L).code("CA-STD").build()).build();
    }

    @Test
    @DisplayName("Should create standing order with correct next execution date")
    void create_Success() {
        when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
        when(instructionRepository.getNextInstructionSequence()).thenReturn(1L);
        when(instructionRepository.save(any())).thenAnswer(inv -> { StandingInstruction s = inv.getArgument(0); s.setId(1L); return s; });

        StandingInstruction result = standingOrderService.create(1L, InstructionType.STANDING_ORDER,
                "2000000001", "Landlord", null, new BigDecimal("5000"), null,
                "MONTHLY", LocalDate.of(2026, 4, 1), LocalDate.of(2027, 3, 1),
                12, null, "Monthly rent");

        assertThat(result.getInstructionRef()).startsWith("SI");
        assertThat(result.getFrequency()).isEqualTo("MONTHLY");
        assertThat(result.getNextExecutionDate()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(result.getStatus()).isEqualTo(StandingStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should pause and resume standing order")
    void pauseResume() {
        StandingInstruction si = StandingInstruction.builder()
                .id(1L).instructionRef("SI0000000000001").instructionType(InstructionType.STANDING_ORDER)
                .debitAccount(account).creditAccountNumber("2000000001")
                .amount(new BigDecimal("5000")).currencyCode("USD")
                .frequency("MONTHLY").startDate(LocalDate.of(2026, 4, 1))
                .nextExecutionDate(LocalDate.of(2026, 5, 1))
                .status(StandingStatus.ACTIVE).maxRetries(3).retryCount(0).build();

        when(instructionRepository.findById(1L)).thenReturn(Optional.of(si));
        when(instructionRepository.save(any())).thenReturn(si);

        standingOrderService.pause(1L);
        assertThat(si.getStatus()).isEqualTo(StandingStatus.PAUSED);

        standingOrderService.resume(1L);
        assertThat(si.getStatus()).isEqualTo(StandingStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should detect completed instruction by max executions")
    void isCompleted_MaxExecutions() {
        StandingInstruction si = StandingInstruction.builder()
                .nextExecutionDate(LocalDate.now().plusMonths(1))
                .maxExecutions(12).totalExecutions(12).frequency("MONTHLY")
                .startDate(LocalDate.now().minusYears(1)).build();

        assertThat(si.isCompleted()).isTrue();
    }

    @Test
    @DisplayName("Should calculate next date correctly for all frequencies")
    void calculateNextDate() {
        LocalDate base = LocalDate.of(2026, 3, 15);

        StandingInstruction weekly = StandingInstruction.builder().nextExecutionDate(base).frequency("WEEKLY").build();
        assertThat(weekly.calculateNextDate()).isEqualTo(base.plusWeeks(1));

        StandingInstruction monthly = StandingInstruction.builder().nextExecutionDate(base).frequency("MONTHLY").build();
        assertThat(monthly.calculateNextDate()).isEqualTo(base.plusMonths(1));

        StandingInstruction quarterly = StandingInstruction.builder().nextExecutionDate(base).frequency("QUARTERLY").build();
        assertThat(quarterly.calculateNextDate()).isEqualTo(base.plusMonths(3));

        StandingInstruction annually = StandingInstruction.builder().nextExecutionDate(base).frequency("ANNUALLY").build();
        assertThat(annually.calculateNextDate()).isEqualTo(base.plusYears(1));
    }
}
