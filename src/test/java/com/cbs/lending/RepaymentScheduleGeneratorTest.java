package com.cbs.lending;

import com.cbs.lending.engine.RepaymentScheduleGenerator;
import com.cbs.lending.entity.LoanRepaymentSchedule;
import com.cbs.lending.entity.RepaymentScheduleType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RepaymentScheduleGeneratorTest {

    private RepaymentScheduleGenerator generator;
    private final BigDecimal PRINCIPAL = new BigDecimal("100000");
    private final BigDecimal RATE = new BigDecimal("12.00"); // 12% p.a.
    private final int TENURE = 12; // 12 months
    private final LocalDate FIRST_DUE = LocalDate.of(2026, 5, 1);

    @BeforeEach
    void setUp() {
        generator = new RepaymentScheduleGenerator();
    }

    @Test
    @DisplayName("EMI calculation: standard annuity formula")
    void emiCalculation() {
        BigDecimal emi = generator.calculateEmi(PRINCIPAL, RATE, TENURE);
        // 100000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) ≈ 8884.88
        assertThat(emi).isBetween(new BigDecimal("8880"), new BigDecimal("8890"));
    }

    @Test
    @DisplayName("EMI at zero interest = principal / tenure")
    void emiZeroRate() {
        BigDecimal emi = generator.calculateEmi(PRINCIPAL, BigDecimal.ZERO, TENURE);
        assertThat(emi).isEqualByComparingTo(new BigDecimal("8333.33"));
    }

    @Test
    @DisplayName("EQUAL_INSTALLMENT: generates correct number of entries, total principal = loan amount")
    void equalInstallment() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, TENURE, RepaymentScheduleType.EQUAL_INSTALLMENT, FIRST_DUE);

        assertThat(schedule).hasSize(TENURE);

        BigDecimal totalPrincipal = schedule.stream()
                .map(LoanRepaymentSchedule::getPrincipalDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(totalPrincipal.setScale(0, RoundingMode.HALF_UP))
                .isEqualByComparingTo(PRINCIPAL.setScale(0, RoundingMode.HALF_UP));

        // Last entry should have zero outstanding
        assertThat(schedule.get(TENURE - 1).getOutstanding())
                .isEqualByComparingTo(BigDecimal.ZERO);

        // Each installment should have correct due date
        assertThat(schedule.get(0).getDueDate()).isEqualTo(FIRST_DUE);
        assertThat(schedule.get(1).getDueDate()).isEqualTo(FIRST_DUE.plusMonths(1));
    }

    @Test
    @DisplayName("EQUAL_PRINCIPAL: declining installments, equal principal portions")
    void equalPrincipal() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, TENURE, RepaymentScheduleType.EQUAL_PRINCIPAL, FIRST_DUE);

        assertThat(schedule).hasSize(TENURE);

        // First installment total should be higher than last (declining)
        assertThat(schedule.get(0).getTotalDue()).isGreaterThan(schedule.get(TENURE - 1).getTotalDue());

        // All principal portions should be approximately equal
        BigDecimal expectedPrincipal = PRINCIPAL.divide(BigDecimal.valueOf(TENURE), 2, RoundingMode.HALF_UP);
        assertThat(schedule.get(0).getPrincipalDue()).isCloseTo(expectedPrincipal, org.assertj.core.data.Offset.offset(new BigDecimal("1")));

        // Last outstanding should be zero
        assertThat(schedule.get(TENURE - 1).getOutstanding()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("BULLET: interest-only payments, principal at maturity")
    void bullet() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, TENURE, RepaymentScheduleType.BULLET, FIRST_DUE);

        assertThat(schedule).hasSize(TENURE);

        // First 11 installments: zero principal, interest only
        for (int i = 0; i < TENURE - 1; i++) {
            assertThat(schedule.get(i).getPrincipalDue()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(schedule.get(i).getInterestDue()).isGreaterThan(BigDecimal.ZERO);
        }

        // Last installment: full principal + interest
        assertThat(schedule.get(TENURE - 1).getPrincipalDue()).isEqualByComparingTo(PRINCIPAL);
    }

    @Test
    @DisplayName("BALLOON: reduced periodic payments, large final payment")
    void balloon() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, TENURE, RepaymentScheduleType.BALLOON, FIRST_DUE);

        assertThat(schedule).hasSize(TENURE);

        // Last installment should be significantly larger than first
        assertThat(schedule.get(TENURE - 1).getPrincipalDue())
                .isGreaterThan(schedule.get(0).getPrincipalDue());

        // Last outstanding should be zero
        assertThat(schedule.get(TENURE - 1).getOutstanding()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("STEP_UP: installments increase over time")
    void stepUp() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, 24, RepaymentScheduleType.STEP_UP, FIRST_DUE);

        assertThat(schedule).hasSize(24);

        // Year 2 installments should be larger than Year 1
        BigDecimal year1Total = schedule.get(0).getTotalDue();
        BigDecimal year2Total = schedule.get(12).getTotalDue();
        assertThat(year2Total).isGreaterThan(year1Total);
    }

    @Test
    @DisplayName("STEP_DOWN: installments decrease over time")
    void stepDown() {
        List<LoanRepaymentSchedule> schedule = generator.generate(
                PRINCIPAL, RATE, 24, RepaymentScheduleType.STEP_DOWN, FIRST_DUE);

        assertThat(schedule).hasSize(24);

        // Year 1 installments should be larger than Year 2
        BigDecimal year1Total = schedule.get(0).getTotalDue();
        BigDecimal year2Total = schedule.get(12).getTotalDue();
        assertThat(year1Total).isGreaterThan(year2Total);
    }
}
