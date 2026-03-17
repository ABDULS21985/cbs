package com.cbs.investacct;

import com.cbs.common.exception.BusinessException;
import com.cbs.fixedincome.entity.*;
import com.cbs.fixedincome.repository.SecurityHoldingRepository;
import com.cbs.investacct.entity.*;
import com.cbs.investacct.repository.*;
import com.cbs.investacct.service.InvestmentAccountingService;
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
class InvestmentAccountingServiceTest {

    @Mock private InvestmentPortfolioRepository portfolioRepository;
    @Mock private InvestmentValuationRepository valuationRepository;
    @Mock private SecurityHoldingRepository holdingRepository;

    @InjectMocks private InvestmentAccountingService investmentService;

    private SecurityHolding holding;
    private InvestmentPortfolio acPortfolio;
    private InvestmentPortfolio fvociPortfolio;
    private InvestmentPortfolio fvtplPortfolio;

    @BeforeEach
    void setUp() {
        holding = SecurityHolding.builder().id(1L).holdingRef("SEC-001")
                .securityType(SecurityType.GOVERNMENT_BOND).securityName("10Y Govt Bond")
                .issuerName("Federal Government").faceValue(new BigDecimal("1000000"))
                .units(BigDecimal.ONE).purchasePrice(new BigDecimal("980000"))
                .couponRate(new BigDecimal("8.0")).couponFrequency("SEMI_ANNUAL")
                .dayCountConvention("ACT/365").currencyCode("USD")
                .purchaseDate(LocalDate.now().minusMonths(6)).settlementDate(LocalDate.now().minusMonths(6))
                .maturityDate(LocalDate.now().plusYears(10))
                .amortisedCost(new BigDecimal("982000"))
                .premiumDiscount(new BigDecimal("-20000"))
                .portfolioCode("HTM-001").status("ACTIVE").build();

        acPortfolio = InvestmentPortfolio.builder().portfolioCode("HTM-001")
                .ifrs9Classification(Ifrs9Classification.AMORTISED_COST).businessModel("HOLD_TO_COLLECT").build();
        fvociPortfolio = InvestmentPortfolio.builder().portfolioCode("AFS-001")
                .ifrs9Classification(Ifrs9Classification.FVOCI).businessModel("HOLD_TO_COLLECT_AND_SELL").build();
        fvtplPortfolio = InvestmentPortfolio.builder().portfolioCode("TRD-001")
                .ifrs9Classification(Ifrs9Classification.FVTPL).businessModel("TRADING").build();
    }

    @Test
    @DisplayName("AMORTISED_COST: carrying = amortised cost, not fair value")
    void amortisedCost_CarriesAtCost() {
        when(holdingRepository.findById(1L)).thenReturn(Optional.of(holding));
        when(portfolioRepository.findByPortfolioCode("HTM-001")).thenReturn(Optional.of(acPortfolio));
        when(valuationRepository.findTopByHoldingIdOrderByValuationDateDesc(1L)).thenReturn(Optional.empty());
        when(valuationRepository.save(any())).thenAnswer(inv -> { InvestmentValuation v = inv.getArgument(0); v.setId(1L); return v; });

        InvestmentValuation result = investmentService.valuateHolding(1L, new BigDecimal("1010000"), LocalDate.now());

        assertThat(result.getIfrs9Classification()).isEqualTo(Ifrs9Classification.AMORTISED_COST);
        assertThat(result.getCarryingAmount()).isEqualByComparingTo(new BigDecimal("982000")); // Amortised, NOT fair value
        assertThat(result.getFairValue()).isEqualByComparingTo(new BigDecimal("1010000"));
        assertThat(result.getUnrealisedGainLoss()).isEqualByComparingTo(BigDecimal.ZERO); // AC: no unrealised GL
        assertThat(result.getEclStage()).isEqualTo(1); // ECL applies
        assertThat(result.getEclAmount()).isPositive();
    }

    @Test
    @DisplayName("FVOCI: carrying = fair value, delta goes to OCI reserve (not P&L)")
    void fvoci_DeltaToOci() {
        holding.setPortfolioCode("AFS-001");
        when(holdingRepository.findById(1L)).thenReturn(Optional.of(holding));
        when(portfolioRepository.findByPortfolioCode("AFS-001")).thenReturn(Optional.of(fvociPortfolio));
        when(valuationRepository.findTopByHoldingIdOrderByValuationDateDesc(1L)).thenReturn(Optional.empty());
        when(valuationRepository.save(any())).thenAnswer(inv -> { InvestmentValuation v = inv.getArgument(0); v.setId(2L); return v; });

        InvestmentValuation result = investmentService.valuateHolding(1L, new BigDecimal("1050000"), LocalDate.now());

        assertThat(result.getIfrs9Classification()).isEqualTo(Ifrs9Classification.FVOCI);
        assertThat(result.getCarryingAmount()).isEqualByComparingTo(new BigDecimal("1050000")); // Fair value
        assertThat(result.getOciReserve()).isEqualByComparingTo(new BigDecimal("68000")); // 1050000 - 982000
        assertThat(result.getEclStage()).isEqualTo(1); // ECL applies for FVOCI
    }

    @Test
    @DisplayName("FVTPL: carrying = fair value, no ECL, unrealised GL to P&L")
    void fvtpl_NoEcl() {
        holding.setPortfolioCode("TRD-001");
        when(holdingRepository.findById(1L)).thenReturn(Optional.of(holding));
        when(portfolioRepository.findByPortfolioCode("TRD-001")).thenReturn(Optional.of(fvtplPortfolio));
        when(valuationRepository.findTopByHoldingIdOrderByValuationDateDesc(1L)).thenReturn(Optional.empty());
        when(valuationRepository.save(any())).thenAnswer(inv -> { InvestmentValuation v = inv.getArgument(0); v.setId(3L); return v; });

        InvestmentValuation result = investmentService.valuateHolding(1L, new BigDecimal("990000"), LocalDate.now());

        assertThat(result.getIfrs9Classification()).isEqualTo(Ifrs9Classification.FVTPL);
        assertThat(result.getCarryingAmount()).isEqualByComparingTo(new BigDecimal("990000"));
        assertThat(result.getUnrealisedGainLoss()).isEqualByComparingTo(new BigDecimal("8000")); // 990000 - 982000
        assertThat(result.getEclStage()).isNull(); // No ECL for FVTPL
        assertThat(result.getOciReserve()).isEqualByComparingTo(BigDecimal.ZERO); // No OCI for FVTPL
    }
}
