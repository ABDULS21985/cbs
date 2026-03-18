package com.cbs.unit.investment;

import com.cbs.common.exception.BusinessException;
import com.cbs.custody.entity.CustodyAccount;
import com.cbs.custody.repository.CustodyAccountRepository;
import com.cbs.custody.service.CustodyService;
import com.cbs.fundmgmt.entity.ManagedFund;
import com.cbs.fundmgmt.repository.ManagedFundRepository;
import com.cbs.fundmgmt.service.FundManagementService;
import com.cbs.investportfolio.entity.InvestPortfolio;
import com.cbs.investportfolio.entity.PortfolioHolding;
import com.cbs.investportfolio.repository.InvestPortfolioRepository;
import com.cbs.investportfolio.repository.PortfolioHoldingRepository;
import com.cbs.investportfolio.service.InvestmentPortfolioService;
import com.cbs.trustservices.entity.TrustAccount;
import com.cbs.trustservices.repository.TrustAccountRepository;
import com.cbs.trustservices.service.TrustService;
import com.cbs.wealthmgmt.entity.WealthManagementPlan;
import com.cbs.wealthmgmt.repository.WealthManagementPlanRepository;
import com.cbs.wealthmgmt.service.WealthManagementService;
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
@DisplayName("Investment & Wealth - Portfolio, Fund, Trust, Custody & Wealth Management")
class InvestmentWealthTest {

    // ── Investment Portfolio Service ─────────────────────────────

    @Nested
    @DisplayName("Investment Portfolio Service")
    class PortfolioTests {

        @Mock private InvestPortfolioRepository portfolioRepository;
        @Mock private PortfolioHoldingRepository holdingRepository;
        @InjectMocks private InvestmentPortfolioService investmentPortfolioService;

        @Test
        @DisplayName("create sets portfolio code, ACTIVE status, and initializes value from initial investment")
        void create_setsCodeStatusAndValue() {
            InvestPortfolio input = InvestPortfolio.builder()
                    .portfolioName("Growth Portfolio").customerId(100L)
                    .portfolioType("GROWTH").riskProfile("MODERATE")
                    .initialInvestment(BigDecimal.valueOf(100000)).build();

            when(portfolioRepository.save(any(InvestPortfolio.class))).thenAnswer(inv -> {
                InvestPortfolio p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            InvestPortfolio result = investmentPortfolioService.create(input);

            assertThat(result.getPortfolioCode()).startsWith("IPF-");
            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            assertThat(result.getCurrentValue()).isEqualByComparingTo(BigDecimal.valueOf(100000));
            assertThat(result.getTotalContributions()).isEqualByComparingTo(BigDecimal.valueOf(100000));
            assertThat(result.getOpenedAt()).isNotNull();
        }

        @Test
        @DisplayName("valuate aggregates holdings market value and calculates return since inception")
        void valuate_aggregatesHoldingsAndCalculatesReturn() {
            InvestPortfolio portfolio = InvestPortfolio.builder()
                    .id(1L).portfolioCode("IPF-VAL00001").portfolioName("Balanced")
                    .customerId(100L).initialInvestment(BigDecimal.valueOf(50000))
                    .currentValue(BigDecimal.valueOf(50000)).build();

            PortfolioHolding h1 = PortfolioHolding.builder()
                    .id(10L).portfolioId(1L).instrumentCode("AAPL").instrumentName("Apple Inc")
                    .assetClass("EQUITY").quantity(BigDecimal.valueOf(10))
                    .avgCostPrice(BigDecimal.valueOf(150)).currentPrice(BigDecimal.valueOf(180))
                    .marketValue(BigDecimal.valueOf(1800)).costBasis(BigDecimal.valueOf(1500))
                    .unrealizedGainLoss(BigDecimal.valueOf(300)).build();

            PortfolioHolding h2 = PortfolioHolding.builder()
                    .id(11L).portfolioId(1L).instrumentCode("MSFT").instrumentName("Microsoft Corp")
                    .assetClass("EQUITY").quantity(BigDecimal.valueOf(20))
                    .avgCostPrice(BigDecimal.valueOf(300)).currentPrice(BigDecimal.valueOf(350))
                    .marketValue(BigDecimal.valueOf(7000)).costBasis(BigDecimal.valueOf(6000))
                    .unrealizedGainLoss(BigDecimal.valueOf(1000)).build();

            when(portfolioRepository.findByPortfolioCode("IPF-VAL00001")).thenReturn(Optional.of(portfolio));
            when(holdingRepository.findByPortfolioIdOrderByWeightPctDesc(1L)).thenReturn(List.of(h1, h2));
            when(holdingRepository.save(any(PortfolioHolding.class))).thenAnswer(inv -> inv.getArgument(0));
            when(portfolioRepository.save(any(InvestPortfolio.class))).thenAnswer(inv -> inv.getArgument(0));

            InvestPortfolio result = investmentPortfolioService.valuate("IPF-VAL00001");

            // Total value = 1800 + 7000 = 8800
            assertThat(result.getCurrentValue()).isEqualByComparingTo(BigDecimal.valueOf(8800));
            // Unrealized = 300 + 1000 = 1300
            assertThat(result.getUnrealizedGainLoss()).isEqualByComparingTo(BigDecimal.valueOf(1300));
            // Return = (8800 - 50000) / 50000 * 100 = -82.4%
            assertThat(result.getReturnSinceInception()).isNotNull();
            verify(holdingRepository, times(2)).save(any(PortfolioHolding.class));
        }
    }

    // ── Fund Management Service ─────────────────────────────────

    @Nested
    @DisplayName("Fund Management Service")
    class FundTests {

        @Mock private ManagedFundRepository fundRepository;
        @InjectMocks private FundManagementService fundManagementService;

        @Test
        @DisplayName("updateNav recalculates total AUM from NAV per unit and units outstanding")
        void updateNav_recalculatesAum() {
            ManagedFund fund = ManagedFund.builder()
                    .id(1L).fundCode("FND-EQUITY01").fundName("CBS Equity Fund")
                    .fundType("EQUITY").fundManager("J. Smith")
                    .navPerUnit(BigDecimal.valueOf(10)).totalUnitsOutstanding(BigDecimal.valueOf(1000000))
                    .totalAum(BigDecimal.valueOf(10000000)).status("ACTIVE").build();

            when(fundRepository.findByFundCode("FND-EQUITY01")).thenReturn(Optional.of(fund));
            when(fundRepository.save(any(ManagedFund.class))).thenAnswer(inv -> inv.getArgument(0));

            ManagedFund result = fundManagementService.updateNav("FND-EQUITY01", BigDecimal.valueOf(12.50));

            assertThat(result.getNavPerUnit()).isEqualByComparingTo(BigDecimal.valueOf(12.50));
            assertThat(result.getNavDate()).isEqualTo(LocalDate.now());
            // AUM = 12.50 * 1,000,000 = 12,500,000
            assertThat(result.getTotalAum()).isEqualByComparingTo(BigDecimal.valueOf(12500000.00));
        }

        @Test
        @DisplayName("create assigns fund code and sets status to DRAFT")
        void create_assignsCodeAndDraftStatus() {
            ManagedFund input = ManagedFund.builder()
                    .fundName("CBS Bond Fund").fundType("FIXED_INCOME")
                    .fundManager("A. Jones").build();

            when(fundRepository.save(any(ManagedFund.class))).thenAnswer(inv -> {
                ManagedFund f = inv.getArgument(0);
                f.setId(2L);
                return f;
            });

            ManagedFund result = fundManagementService.create(input);

            assertThat(result.getFundCode()).startsWith("FND-");
            assertThat(result.getStatus()).isEqualTo("DRAFT");
        }
    }

    // ── Trust Service ────────────────────────────────────────────

    @Nested
    @DisplayName("Trust Service")
    class TrustTests {

        @Mock private TrustAccountRepository trustRepository;
        @InjectMocks private TrustService trustService;

        @Test
        @DisplayName("recordDistribution reduces corpus value and increases YTD distributions")
        void recordDistribution_reducesCorpusIncreasesYtd() {
            TrustAccount trust = TrustAccount.builder()
                    .id(1L).trustCode("TRS-FAMILY01").trustName("Smith Family Trust")
                    .trustType("REVOCABLE").grantorCustomerId(200L)
                    .trusteeType("INDIVIDUAL").trusteeName("Jane Smith")
                    .corpusValue(BigDecimal.valueOf(500000))
                    .distributionsYtd(BigDecimal.valueOf(10000))
                    .inceptionDate(LocalDate.of(2020, 1, 1)).build();

            when(trustRepository.findByTrustCode("TRS-FAMILY01")).thenReturn(Optional.of(trust));
            when(trustRepository.save(any(TrustAccount.class))).thenAnswer(inv -> inv.getArgument(0));

            TrustAccount result = trustService.recordDistribution("TRS-FAMILY01", BigDecimal.valueOf(25000));

            assertThat(result.getCorpusValue()).isEqualByComparingTo(BigDecimal.valueOf(475000));
            assertThat(result.getDistributionsYtd()).isEqualByComparingTo(BigDecimal.valueOf(35000));
        }

        @Test
        @DisplayName("recordDistribution throws BusinessException when amount exceeds corpus")
        void recordDistribution_exceedsCorpus_throwsException() {
            TrustAccount trust = TrustAccount.builder()
                    .id(2L).trustCode("TRS-SMALL01").trustName("Small Trust")
                    .trustType("IRREVOCABLE").grantorCustomerId(201L)
                    .trusteeType("CORPORATE").trusteeName("CBS Trust Co")
                    .corpusValue(BigDecimal.valueOf(10000))
                    .distributionsYtd(BigDecimal.ZERO)
                    .inceptionDate(LocalDate.of(2022, 6, 1)).build();

            when(trustRepository.findByTrustCode("TRS-SMALL01")).thenReturn(Optional.of(trust));

            assertThatThrownBy(() -> trustService.recordDistribution("TRS-SMALL01", BigDecimal.valueOf(50000)))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Distribution amount exceeds corpus value");
        }
    }

    // ── Custody Service ──────────────────────────────────────────

    @Nested
    @DisplayName("Custody Service")
    class CustodyTests {

        @Mock private CustodyAccountRepository custodyRepository;
        @InjectMocks private CustodyService custodyService;

        @Test
        @DisplayName("open assigns account code, ACTIVE status, and sets opened timestamp")
        void open_assignsCodeAndActivatesAccount() {
            CustodyAccount input = CustodyAccount.builder()
                    .accountName("Institutional Custody").customerId(300L)
                    .accountType("INSTITUTIONAL").build();

            when(custodyRepository.save(any(CustodyAccount.class))).thenAnswer(inv -> {
                CustodyAccount a = inv.getArgument(0);
                a.setId(1L);
                return a;
            });

            CustodyAccount result = custodyService.open(input);

            assertThat(result.getAccountCode()).startsWith("CUS-");
            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            assertThat(result.getOpenedAt()).isNotNull();
        }
    }

    // ── Wealth Management Service ────────────────────────────────

    @Nested
    @DisplayName("Wealth Management Service")
    class WealthTests {

        @Mock private WealthManagementPlanRepository planRepository;
        @InjectMocks private WealthManagementService wealthManagementService;

        @Test
        @DisplayName("activate transitions plan status from DRAFT to ACTIVE")
        void activate_transitionsDraftToActive() {
            WealthManagementPlan plan = WealthManagementPlan.builder()
                    .id(1L).planCode("WMP-RETIRE01").customerId(400L)
                    .planType("RETIREMENT").advisorId("ADV-001")
                    .status("DRAFT").build();

            when(planRepository.findByPlanCode("WMP-RETIRE01")).thenReturn(Optional.of(plan));
            when(planRepository.save(any(WealthManagementPlan.class))).thenAnswer(inv -> inv.getArgument(0));

            WealthManagementPlan result = wealthManagementService.activate("WMP-RETIRE01");

            assertThat(result.getStatus()).isEqualTo("ACTIVE");
            verify(planRepository).save(any(WealthManagementPlan.class));
        }
    }
}
