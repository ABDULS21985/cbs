package com.cbs.investportfolio;

import com.cbs.investportfolio.entity.InvestPortfolio;
import com.cbs.investportfolio.entity.PortfolioHolding;
import com.cbs.investportfolio.repository.InvestPortfolioRepository;
import com.cbs.investportfolio.repository.PortfolioHoldingRepository;
import com.cbs.investportfolio.service.InvestmentPortfolioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvestmentPortfolioServiceTest {

    @Mock private InvestPortfolioRepository portfolioRepository;
    @Mock private PortfolioHoldingRepository holdingRepository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private InvestmentPortfolioService service;

    @Test
    @DisplayName("Portfolio creation sets initial value and contributions")
    void createSetsInitialValues() {
        InvestPortfolio p = new InvestPortfolio();
        p.setPortfolioName("Growth Fund");
        p.setInitialInvestment(new BigDecimal("1000000"));
        p.setCustomerId(1L);

        when(portfolioRepository.save(any())).thenAnswer(inv -> {
            InvestPortfolio saved = inv.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        InvestPortfolio result = service.create(p);

        assertThat(result.getPortfolioCode()).startsWith("IPF-");
        assertThat(result.getCurrentValue()).isEqualByComparingTo("1000000");
        assertThat(result.getTotalContributions()).isEqualByComparingTo("1000000");
        assertThat(result.getOpenedAt()).isNotNull();
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Valuation sums holdings, recalculates weights, computes return")
    void valuationCalculatesCorrectly() {
        InvestPortfolio p = new InvestPortfolio();
        p.setId(1L);
        p.setPortfolioCode("IPF-TEST");
        p.setInitialInvestment(new BigDecimal("1000000"));

        PortfolioHolding h1 = PortfolioHolding.builder()
                .id(1L).portfolioId(1L).instrumentCode("AAPL").instrumentName("Apple")
                .assetClass("EQUITY").quantity(new BigDecimal("100"))
                .avgCostPrice(new BigDecimal("100")).currentPrice(new BigDecimal("115"))
                .marketValue(new BigDecimal("690000"))
                .costBasis(new BigDecimal("600000"))
                .unrealizedGainLoss(new BigDecimal("90000")).build();

        PortfolioHolding h2 = PortfolioHolding.builder()
                .id(2L).portfolioId(1L).instrumentCode("MSFT").instrumentName("Microsoft")
                .assetClass("EQUITY").quantity(new BigDecimal("200"))
                .avgCostPrice(new BigDecimal("50")).currentPrice(new BigDecimal("57.5"))
                .marketValue(new BigDecimal("460000"))
                .costBasis(new BigDecimal("400000"))
                .unrealizedGainLoss(new BigDecimal("60000")).build();

        when(portfolioRepository.findByPortfolioCode("IPF-TEST")).thenReturn(Optional.of(p));
        when(holdingRepository.findByPortfolioIdOrderByWeightPctDesc(1L)).thenReturn(List.of(h1, h2));
        when(holdingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(portfolioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        InvestPortfolio result = service.valuate("IPF-TEST");

        // Total value: 690000 + 460000 = 1150000
        assertThat(result.getCurrentValue()).isEqualByComparingTo("1150000");
        // Unrealized: 90000 + 60000 = 150000
        assertThat(result.getUnrealizedGainLoss()).isEqualByComparingTo("150000");
        // Return since inception: (1150000 - 1000000) / 1000000 * 100 = 15%
        assertThat(result.getReturnSinceInception()).isEqualByComparingTo("15.0000");
    }
}
