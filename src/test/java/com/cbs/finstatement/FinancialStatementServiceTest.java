package com.cbs.finstatement;

import com.cbs.common.exception.BusinessException;
import com.cbs.finstatement.entity.FinancialStatement;
import com.cbs.finstatement.entity.StatementRatio;
import com.cbs.finstatement.repository.FinancialStatementRepository;
import com.cbs.finstatement.repository.StatementRatioRepository;
import com.cbs.finstatement.service.FinancialStatementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinancialStatementServiceTest {

    @Mock
    private FinancialStatementRepository statementRepository;

    @Mock
    private StatementRatioRepository ratioRepository;

    @InjectMocks
    private FinancialStatementService service;

    @Test
    @DisplayName("calculateRatios produces correct current ratio (currentAssets / currentLiabilities)")
    void calculateRatiosProducesCorrectCurrentRatio() {
        FinancialStatement stmt = new FinancialStatement();
        stmt.setId(1L);
        stmt.setStatementCode("FS-TEST00001");
        stmt.setCurrentAssets(new BigDecimal("200000"));
        stmt.setCurrentLiabilities(new BigDecimal("100000"));
        stmt.setTotalAssets(new BigDecimal("500000"));
        stmt.setTotalLiabilities(new BigDecimal("250000"));
        stmt.setTotalEquity(new BigDecimal("250000"));
        stmt.setTotalRevenue(new BigDecimal("150000"));
        stmt.setNetIncome(new BigDecimal("30000"));
        stmt.setEbitda(new BigDecimal("50000"));

        when(statementRepository.findByStatementCode("FS-TEST00001")).thenReturn(Optional.of(stmt));
        when(ratioRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        List<StatementRatio> ratios = service.calculateRatios("FS-TEST00001");

        StatementRatio currentRatio = ratios.stream()
                .filter(r -> "current_ratio".equals(r.getRatioName()))
                .findFirst().orElseThrow();

        // 200000 / 100000 = 2.0000
        assertThat(currentRatio.getRatioValue()).isEqualByComparingTo(new BigDecimal("2.0000"));
        assertThat(currentRatio.getRatioCategory()).isEqualTo("LIQUIDITY");
        assertThat(currentRatio.getRating()).isEqualTo("EXCELLENT");
    }

    @Test
    @DisplayName("Approve rejects non-SUBMITTED statements")
    void approveRejectsNonSubmittedStatements() {
        FinancialStatement stmt = new FinancialStatement();
        stmt.setId(1L);
        stmt.setStatementCode("FS-TEST00002");
        stmt.setStatus("DRAFT");

        when(statementRepository.findByStatementCode("FS-TEST00002")).thenReturn(Optional.of(stmt));

        assertThatThrownBy(() -> service.approve("FS-TEST00002"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must be SUBMITTED");
    }
}
