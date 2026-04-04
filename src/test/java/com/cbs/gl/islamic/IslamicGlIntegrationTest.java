package com.cbs.gl.islamic;

import com.cbs.AbstractIntegrationTest;
import com.cbs.gl.entity.GlBalance;
import com.cbs.gl.entity.IslamicAccountCategory;
import com.cbs.gl.islamic.dto.AaoifiBalanceSheet;
import com.cbs.gl.islamic.repository.IslamicPostingRuleRepository;
import com.cbs.gl.islamic.service.IslamicChartOfAccountsService;
import com.cbs.gl.repository.ChartOfAccountsRepository;
import com.cbs.gl.repository.GlBalanceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class IslamicGlIntegrationTest extends AbstractIntegrationTest {

    @Autowired private ChartOfAccountsRepository chartOfAccountsRepository;
    @Autowired private IslamicPostingRuleRepository postingRuleRepository;
    @Autowired private GlBalanceRepository glBalanceRepository;
    @Autowired private IslamicChartOfAccountsService chartService;

    @Test
    @DisplayName("seed data loads Islamic AAOIFI accounts and posting rules")
    void seedDataLoads() {
        assertThat(chartOfAccountsRepository.findByIsIslamicAccountTrueOrderByGlCodeAsc()).hasSizeGreaterThanOrEqualTo(45);
        assertThat(chartOfAccountsRepository.findByIslamicAccountCategoryOrderByGlCodeAsc(IslamicAccountCategory.CASH_AND_EQUIVALENTS))
                .isNotEmpty();
        assertThat(postingRuleRepository.findByRuleCode("MRB-DISB-001")).isPresent();
        assertThat(postingRuleRepository.findByRuleCode("PER-RET-001")).isPresent();
    }

    @Test
    @DisplayName("AAOIFI balance sheet aggregates seeded accounts from GL balances")
    void seededAccountsBalanceSheetAggregates() {
        LocalDate asOfDate = LocalDate.of(2026, 1, 31);
        glBalanceRepository.save(balance("1100-000-001", new BigDecimal("100.00"), asOfDate));
        glBalanceRepository.save(balance("2100-WAD-001", new BigDecimal("40.00"), asOfDate));
        glBalanceRepository.save(balance("3100-MDR-001", new BigDecimal("30.00"), asOfDate));
        glBalanceRepository.save(balance("4100-000-001", new BigDecimal("30.00"), asOfDate));

        AaoifiBalanceSheet sheet = chartService.generateAaoifiBalanceSheet(asOfDate);

        assertThat(sheet.getAssets().getCashAndEquivalents()).isEqualByComparingTo("100.00");
        assertThat(sheet.getLiabilities().getCurrentAccountsWadiah()).isEqualByComparingTo("40.00");
        assertThat(sheet.getUnrestrictedInvestmentAccounts().getGrossBalance()).isEqualByComparingTo("30.00");
        assertThat(sheet.getOwnersEquity().getPaidUpCapital()).isEqualByComparingTo("30.00");
        assertThat(sheet.getIsBalanced()).isTrue();
    }

    private GlBalance balance(String glCode, BigDecimal amount, LocalDate date) {
        return GlBalance.builder()
                .glCode(glCode)
                .branchCode("HEAD")
                .currencyCode("USD")
                .balanceDate(date)
                .openingBalance(BigDecimal.ZERO)
                .debitTotal(BigDecimal.ZERO)
                .creditTotal(BigDecimal.ZERO)
                .closingBalance(amount)
                .transactionCount(0)
                .build();
    }
}
