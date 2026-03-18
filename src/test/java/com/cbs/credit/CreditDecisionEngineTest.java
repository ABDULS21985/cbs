package com.cbs.credit;

import com.cbs.credit.engine.CreditDecisionEngine;
import com.cbs.credit.entity.CreditDecision;
import com.cbs.credit.entity.CreditScoringModel;
import com.cbs.customer.entity.Customer;
import com.cbs.customer.entity.CustomerStatus;
import com.cbs.customer.entity.CustomerType;
import com.cbs.customer.entity.RiskRating;
import com.cbs.lending.entity.LoanApplication;
import com.cbs.lending.entity.LoanProduct;
import com.cbs.lending.entity.LoanType;
import com.cbs.lending.repository.LoanAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreditDecisionEngineTest {

    @Mock private LoanAccountRepository loanAccountRepository;
    @InjectMocks private CreditDecisionEngine engine;

    private Customer goodCustomer;
    private Customer riskyCustomer;
    private Customer sanctionedCustomer;
    private LoanProduct product;
    private CreditScoringModel model;

    @BeforeEach
    void setUp() {
        goodCustomer = Customer.builder()
                .id(1L).customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE).riskRating(RiskRating.LOW)
                .dateOfBirth(LocalDate.of(1985, 6, 15)).build();
        goodCustomer.setCreatedAt(Instant.now().minusSeconds(86400 * 730)); // 2 years ago

        riskyCustomer = Customer.builder()
                .id(2L).customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE).riskRating(RiskRating.HIGH)
                .dateOfBirth(LocalDate.of(2005, 1, 1)).build();
        riskyCustomer.setCreatedAt(Instant.now().minusSeconds(86400 * 30)); // 30 days ago

        sanctionedCustomer = Customer.builder()
                .id(3L).customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE).riskRating(RiskRating.SANCTIONED).build();
        sanctionedCustomer.setCreatedAt(Instant.now());

        product = LoanProduct.builder()
                .id(1L).code("PL-USD").name("Personal Loan").loanType(LoanType.PERSONAL)
                .targetSegment("RETAIL").currencyCode("USD")
                .minInterestRate(new BigDecimal("8.00")).maxInterestRate(new BigDecimal("24.00"))
                .defaultInterestRate(new BigDecimal("15.00"))
                .minLoanAmount(new BigDecimal("1000")).maxLoanAmount(new BigDecimal("500000"))
                .minTenureMonths(3).maxTenureMonths(60)
                .requiresCollateral(false).isActive(true).build();

        model = CreditScoringModel.builder()
                .id(1L).modelCode("DEFAULT").modelName("Standard Scorecard")
                .modelType("SCORECARD").targetSegment("RETAIL")
                .minScore(0).maxScore(1000).cutoffScore(500)
                .isActive(true).modelConfig(Map.of()).build();
    }

    @Test
    @DisplayName("Good customer with low risk should be APPROVED")
    void goodCustomer_Approved() {
        LoanApplication app = buildApplication(goodCustomer, new BigDecimal("50000"), 24);
        when(loanAccountRepository.getTotalOutstandingForCustomer(1L)).thenReturn(BigDecimal.ZERO);

        CreditDecisionEngine.DecisionResult result = engine.evaluate(app, goodCustomer, product, model);

        assertThat(result.getDecision()).isEqualTo(CreditDecision.APPROVE);
        assertThat(result.getScore()).isGreaterThan(model.getCutoffScore());
        assertThat(result.getRiskGrade()).isIn("A", "B", "C");
        assertThat(result.getRecommendedAmount()).isNotNull();
        assertThat(result.getExecutionTimeMs()).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("Risky young customer with high risk rating should be DECLINED or REFERRED")
    void riskyCustomer_DeclinedOrReferred() {
        LoanApplication app = buildApplication(riskyCustomer, new BigDecimal("200000"), 48);
        when(loanAccountRepository.getTotalOutstandingForCustomer(2L)).thenReturn(new BigDecimal("350000"));

        CreditDecisionEngine.DecisionResult result = engine.evaluate(app, riskyCustomer, product, model);

        assertThat(result.getDecision()).isIn(CreditDecision.DECLINE, CreditDecision.REFER, CreditDecision.CONDITIONAL);
        assertThat(result.getDecisionReasons()).isNotEmpty();
    }

    @Test
    @DisplayName("Sanctioned customer should always be DECLINED")
    void sanctionedCustomer_AlwaysDeclined() {
        LoanApplication app = buildApplication(sanctionedCustomer, new BigDecimal("10000"), 12);
        when(loanAccountRepository.getTotalOutstandingForCustomer(3L)).thenReturn(BigDecimal.ZERO);

        CreditDecisionEngine.DecisionResult result = engine.evaluate(app, sanctionedCustomer, product, model);

        assertThat(result.getDecision()).isEqualTo(CreditDecision.DECLINE);
        assertThat(result.getDecisionReasons()).anyMatch(r -> r.contains("sanctions"));
    }

    @Test
    @DisplayName("Score should be within model bounds")
    void scoreBounds() {
        LoanApplication app = buildApplication(goodCustomer, new BigDecimal("25000"), 12);
        when(loanAccountRepository.getTotalOutstandingForCustomer(1L)).thenReturn(BigDecimal.ZERO);

        CreditDecisionEngine.DecisionResult result = engine.evaluate(app, goodCustomer, product, model);

        assertThat(result.getScore()).isBetween(model.getMinScore(), model.getMaxScore());
    }

    @Test
    @DisplayName("Risk grade should be A-E based on score percentage")
    void riskGradeRange() {
        LoanApplication app = buildApplication(goodCustomer, new BigDecimal("5000"), 6);
        when(loanAccountRepository.getTotalOutstandingForCustomer(1L)).thenReturn(BigDecimal.ZERO);

        CreditDecisionEngine.DecisionResult result = engine.evaluate(app, goodCustomer, product, model);

        assertThat(result.getRiskGrade()).isIn("A", "B", "C", "D", "E");
    }

    private LoanApplication buildApplication(Customer customer, BigDecimal amount, int tenure) {
        return LoanApplication.builder()
                .id(1L).applicationNumber("LA000000500001")
                .customer(customer).loanProduct(product)
                .requestedAmount(amount).requestedTenureMonths(tenure)
                .currencyCode("USD").build();
    }
}
