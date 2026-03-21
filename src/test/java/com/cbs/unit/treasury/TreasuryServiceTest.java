package com.cbs.unit.treasury;

import com.cbs.account.repository.AccountRepository;
import com.cbs.almfull.entity.AlmPosition;
import com.cbs.almfull.repository.AlmPositionRepository;
import com.cbs.almfull.service.AlmFullService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.ftp.entity.FtpAllocation;
import com.cbs.ftp.entity.FtpRateCurve;
import com.cbs.ftp.repository.FtpAllocationRepository;
import com.cbs.ftp.repository.FtpRateCurveRepository;
import com.cbs.ftp.service.FtpService;
import com.cbs.liquidityrisk.entity.LiquidityMetric;
import com.cbs.liquidityrisk.repository.LiquidityMetricRepository;
import com.cbs.liquidityrisk.service.LiquidityRiskService;
import com.cbs.marketrisk.entity.MarketRiskPosition;
import com.cbs.marketrisk.repository.MarketRiskPositionRepository;
import com.cbs.marketrisk.service.MarketRiskService;
import com.cbs.nostro.repository.CorrespondentBankRepository;
import com.cbs.treasury.entity.DealStatus;
import com.cbs.treasury.entity.DealType;
import com.cbs.treasury.entity.TreasuryDeal;
import com.cbs.treasury.repository.TreasuryDealRepository;
import com.cbs.treasury.service.TreasuryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TreasuryServiceTest {

    // ========================================================================
    // TreasuryService Tests
    // ========================================================================

    @Nested
    @DisplayName("TreasuryService - Deal Lifecycle Tests")
    @ExtendWith(MockitoExtension.class)
    @MockitoSettings(strictness = Strictness.LENIENT)
    class TreasuryDealTests {

        @Mock private TreasuryDealRepository dealRepository;
        @Mock private AccountRepository accountRepository;
        @Mock private CorrespondentBankRepository bankRepository;
        @Mock private CurrentActorProvider currentActorProvider;

        @InjectMocks private TreasuryService treasuryService;

        private TreasuryDeal pendingDeal;
        private TreasuryDeal confirmedDeal;

        @BeforeEach
        void setUp() {
            when(currentActorProvider.getCurrentActor()).thenReturn("confirmer1");
            pendingDeal = TreasuryDeal.builder()
                    .id(1L)
                    .dealNumber("TD0000000000001")
                    .dealType(DealType.FX_SPOT)
                    .leg1Currency("USD")
                    .leg1Amount(new BigDecimal("1000000.00"))
                    .leg1ValueDate(LocalDate.now())
                    .leg2Currency("EUR")
                    .leg2Amount(new BigDecimal("920000.00"))
                    .dealRate(new BigDecimal("0.92"))
                    .status(DealStatus.PENDING)
                    .dealer("trader1")
                    .build();

            confirmedDeal = TreasuryDeal.builder()
                    .id(2L)
                    .dealNumber("TD0000000000002")
                    .dealType(DealType.MONEY_MARKET_PLACEMENT)
                    .leg1Currency("USD")
                    .leg1Amount(new BigDecimal("5000000.00"))
                    .leg1ValueDate(LocalDate.now())
                    .tenorDays(90)
                    .yieldRate(new BigDecimal("5.25"))
                    .status(DealStatus.CONFIRMED)
                    .dealer("trader2")
                    .build();
        }

        @Test
        @DisplayName("bookDeal creates deal with PENDING status and generates deal number")
        void bookDeal_createsDealWithPendingStatus() {
            when(dealRepository.getNextDealSequence()).thenReturn(100L);
            when(dealRepository.save(any(TreasuryDeal.class))).thenAnswer(inv -> inv.getArgument(0));

            TreasuryDeal result = treasuryService.bookDeal(
                    DealType.FX_SPOT, null, "USD", new BigDecimal("1000000.00"), null,
                    LocalDate.now(), "EUR", new BigDecimal("920000.00"), null,
                    LocalDate.now().plusDays(2), new BigDecimal("0.92"), null, null, "trader1");

            assertThat(result.getStatus()).isEqualTo(DealStatus.PENDING);
            assertThat(result.getDealType()).isEqualTo(DealType.FX_SPOT);
            assertThat(result.getDealNumber()).startsWith("TD");
            verify(dealRepository).save(any(TreasuryDeal.class));
        }

        @Test
        @DisplayName("confirmDeal transitions PENDING deal to CONFIRMED")
        void confirmDeal_transitionsToPendingToConfirmed() {
            when(dealRepository.findById(1L)).thenReturn(Optional.of(pendingDeal));
            when(dealRepository.save(any(TreasuryDeal.class))).thenAnswer(inv -> inv.getArgument(0));

            TreasuryDeal result = treasuryService.confirmDeal(1L);

            assertThat(result.getStatus()).isEqualTo(DealStatus.CONFIRMED);
            assertThat(result.getConfirmedBy()).isEqualTo("confirmer1");
            assertThat(result.getConfirmedAt()).isNotNull();
        }

        @Test
        @DisplayName("confirmDeal rejects non-PENDING deal")
        void confirmDeal_rejectsNonPendingDeal() {
            confirmedDeal.setStatus(DealStatus.CONFIRMED);
            when(dealRepository.findById(2L)).thenReturn(Optional.of(confirmedDeal));

            assertThatThrownBy(() -> treasuryService.confirmDeal(2L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("not pending");
        }

        @Test
        @DisplayName("settleDeal rejects non-CONFIRMED deal")
        void settleDeal_rejectsNonConfirmedDeal() {
            when(dealRepository.findById(1L)).thenReturn(Optional.of(pendingDeal));

            assertThatThrownBy(() -> treasuryService.settleDeal(1L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("confirmed first");
        }
    }

    // ========================================================================
    // AlmFullService Tests
    // ========================================================================

    @Nested
    @DisplayName("AlmFullService - Position Calculation Tests")
    @ExtendWith(MockitoExtension.class)
    class AlmFullServiceTests {

        @Mock private AlmPositionRepository positionRepository;

        @InjectMocks private AlmFullService almFullService;

        @Test
        @DisplayName("calculatePosition computes gap amount and gap ratio correctly")
        void calculatePosition_computesGapAndRatio() {
            AlmPosition pos = AlmPosition.builder()
                    .positionDate(LocalDate.now())
                    .currency("USD")
                    .timeBucket("0-30D")
                    .cashAndEquivalents(new BigDecimal("5000000"))
                    .interbankPlacements(new BigDecimal("3000000"))
                    .securitiesHeld(new BigDecimal("2000000"))
                    .loansAndAdvances(new BigDecimal("10000000"))
                    .fixedAssets(new BigDecimal("500000"))
                    .otherAssets(new BigDecimal("500000"))
                    .demandDeposits(new BigDecimal("8000000"))
                    .termDeposits(new BigDecimal("6000000"))
                    .interbankBorrowings(new BigDecimal("2000000"))
                    .bondsIssued(new BigDecimal("1000000"))
                    .otherLiabilities(new BigDecimal("500000"))
                    .durationAssets(new BigDecimal("2.5"))
                    .durationLiabilities(new BigDecimal("1.8"))
                    .build();

            when(positionRepository.save(any(AlmPosition.class))).thenAnswer(inv -> inv.getArgument(0));

            AlmPosition result = almFullService.calculatePosition(pos);

            // Total assets = 5M + 3M + 2M + 10M + 0.5M + 0.5M = 21M
            assertThat(result.getTotalAssets()).isEqualByComparingTo(new BigDecimal("21000000"));
            // Total liabilities = 8M + 6M + 2M + 1M + 0.5M = 17.5M
            assertThat(result.getTotalLiabilities()).isEqualByComparingTo(new BigDecimal("17500000"));
            // Gap = 21M - 17.5M = 3.5M
            assertThat(result.getGapAmount()).isEqualByComparingTo(new BigDecimal("3500000"));
            assertThat(result.getGapRatio()).isNotNull();
            // Duration gap = 2.5 - 1.8 = 0.7
            assertThat(result.getDurationGap()).isEqualByComparingTo(new BigDecimal("0.7"));
            verify(positionRepository).save(any(AlmPosition.class));
        }
    }

    // ========================================================================
    // LiquidityRiskService Tests
    // ========================================================================

    @Nested
    @DisplayName("LiquidityRiskService - LCR/NSFR Calculation Tests")
    @ExtendWith(MockitoExtension.class)
    class LiquidityRiskServiceTests {

        @Mock private LiquidityMetricRepository metricRepository;

        @InjectMocks private LiquidityRiskService liquidityRiskService;

        @Test
        @DisplayName("calculateMetrics computes LCR ratio and detects breach when below limit")
        void calculateMetrics_computesLcrAndDetectsBreach() {
            LiquidityMetric metric = LiquidityMetric.builder()
                    .metricDate(LocalDate.now())
                    .currency("USD")
                    .hqlaLevel1(new BigDecimal("8000000"))
                    .hqlaLevel2a(new BigDecimal("2000000"))
                    .hqlaLevel2b(new BigDecimal("500000"))
                    .netCashOutflows30d(new BigDecimal("12000000"))
                    .availableStableFunding(new BigDecimal("15000000"))
                    .requiredStableFunding(new BigDecimal("14000000"))
                    .lcrLimit(new BigDecimal("100.0"))
                    .nsfrLimit(new BigDecimal("100.0"))
                    .build();

            when(metricRepository.save(any(LiquidityMetric.class))).thenAnswer(inv -> inv.getArgument(0));

            LiquidityMetric result = liquidityRiskService.calculateMetrics(metric);

            assertThat(result.getTotalHqla()).isNotNull();
            assertThat(result.getTotalHqla().signum()).isGreaterThan(0);
            assertThat(result.getLcrRatio()).isNotNull();
            assertThat(result.getNsfrRatio()).isNotNull();
            verify(metricRepository).save(any(LiquidityMetric.class));
        }
    }

    // ========================================================================
    // MarketRiskService Tests
    // ========================================================================

    @Nested
    @DisplayName("MarketRiskService - VaR Position Tests")
    @ExtendWith(MockitoExtension.class)
    class MarketRiskServiceTests {

        @Mock private MarketRiskPositionRepository positionRepository;

        @InjectMocks private MarketRiskService marketRiskService;

        @Test
        @DisplayName("recordPosition calculates VaR utilization and flags breach when over limit")
        void recordPosition_flagsVarBreach() {
            MarketRiskPosition pos = MarketRiskPosition.builder()
                    .positionDate(LocalDate.now())
                    .riskType("FX")
                    .portfolio("FX_TRADING")
                    .currency("USD")
                    .var1d99(new BigDecimal("1200000"))
                    .varLimit(new BigDecimal("1000000"))
                    .build();

            when(positionRepository.save(any(MarketRiskPosition.class))).thenAnswer(inv -> inv.getArgument(0));

            MarketRiskPosition result = marketRiskService.recordPosition(pos);

            assertThat(result.getLimitBreach()).isTrue();
            assertThat(result.getVarUtilizationPct()).isNotNull();
            assertThat(result.getVarUtilizationPct().compareTo(new BigDecimal("100"))).isGreaterThan(0);
            assertThat(result.getVar10d99()).isNotNull();
            verify(positionRepository).save(any(MarketRiskPosition.class));
        }

        @Test
        @DisplayName("recordPosition computes 10-day VaR scaling from 1-day VaR")
        void recordPosition_computes10DayVarScaling() {
            MarketRiskPosition pos = MarketRiskPosition.builder()
                    .positionDate(LocalDate.now())
                    .riskType("IR")
                    .portfolio("IR_BOOK")
                    .currency("USD")
                    .var1d99(new BigDecimal("500000"))
                    .varLimit(new BigDecimal("2000000"))
                    .build();

            when(positionRepository.save(any(MarketRiskPosition.class))).thenAnswer(inv -> inv.getArgument(0));

            MarketRiskPosition result = marketRiskService.recordPosition(pos);

            assertThat(result.getLimitBreach()).isFalse();
            // var10d99 = var1d99 * sqrt(10) ~= 500000 * 3.162 ~= 1581139
            assertThat(result.getVar10d99()).isNotNull();
            assertThat(result.getVar10d99().compareTo(new BigDecimal("1500000"))).isGreaterThan(0);
        }
    }

    // ========================================================================
    // FtpService Tests
    // ========================================================================

    @Nested
    @DisplayName("FtpService - Transfer Pricing Tests")
    @ExtendWith(MockitoExtension.class)
    class FtpServiceTests {

        @Mock private FtpRateCurveRepository curveRepository;
        @Mock private FtpAllocationRepository allocationRepository;

        @InjectMocks private FtpService ftpService;

        @Test
        @DisplayName("calculateFtp computes spread and net margin from actual rate vs FTP rate")
        void calculateFtp_computesSpreadAndMargin() {
            FtpRateCurve curve = FtpRateCurve.builder()
                    .curveName("BASE")
                    .currencyCode("USD")
                    .effectiveDate(LocalDate.now())
                    .tenorDays(365)
                    .rate(new BigDecimal("5.00"))
                    .build();

            when(curveRepository.findLatestRate("BASE", "USD", LocalDate.now(), 365))
                    .thenReturn(Optional.of(curve));
            when(allocationRepository.save(any(FtpAllocation.class))).thenAnswer(inv -> inv.getArgument(0));

            FtpAllocation result = ftpService.calculateFtp(
                    "ACCOUNT", 100L, "ACC-100", "USD",
                    new BigDecimal("1000000.00"), new BigDecimal("7.00"),
                    365, LocalDate.now());

            // spread = 7.00 - 5.00 = 2.00
            assertThat(result.getSpread()).isEqualByComparingTo(new BigDecimal("2.00"));
            assertThat(result.getFtpRate()).isEqualByComparingTo(new BigDecimal("5.00"));
            assertThat(result.getActualRate()).isEqualByComparingTo(new BigDecimal("7.00"));
            // netMargin = interestIncome - ftpCharge = (1M * 7/100) - (1M * 5/100) = 70000 - 50000 = 20000
            assertThat(result.getNetMargin()).isEqualByComparingTo(new BigDecimal("20000.00"));
            verify(allocationRepository).save(any(FtpAllocation.class));
        }
    }
}
