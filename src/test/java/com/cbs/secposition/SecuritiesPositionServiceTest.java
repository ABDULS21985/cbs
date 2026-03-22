package com.cbs.secposition;

import com.cbs.secposition.entity.SecuritiesMovement;
import com.cbs.secposition.entity.SecuritiesPosition;
import com.cbs.secposition.repository.SecuritiesMovementRepository;
import com.cbs.secposition.repository.SecuritiesPositionRepository;
import com.cbs.secposition.service.SecuritiesPositionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecuritiesPositionServiceTest {

    @Mock private SecuritiesPositionRepository positionRepository;
    @Mock private SecuritiesMovementRepository movementRepository;
    @InjectMocks private SecuritiesPositionService service;

    // ── record ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("record - generates positionId starting with SP- and calculates costBasis, marketValue, unrealizedGainLoss, availableQuantity")
    void record_generatesPositionIdAndCalculatesFields() {
        when(positionRepository.save(any(SecuritiesPosition.class))).thenAnswer(inv -> {
            SecuritiesPosition p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        SecuritiesPosition pos = SecuritiesPosition.builder()
                .instrumentCode("AAPL")
                .instrumentName("Apple Inc.")
                .positionDate(LocalDate.now())
                .quantity(new BigDecimal("1000"))
                .avgCost(new BigDecimal("150.00"))
                .currentPrice(new BigDecimal("175.00"))
                .pledgedQuantity(new BigDecimal("200"))
                .build();

        SecuritiesPosition result = service.record(pos);

        assertThat(result.getPositionId()).startsWith("SP-");
        assertThat(result.getPositionId()).hasSize(13); // "SP-" + 10 chars

        // costBasis = quantity * avgCost = 1000 * 150 = 150000
        assertThat(result.getCostBasis())
                .isEqualByComparingTo(new BigDecimal("150000.00"));

        // marketValue = quantity * currentPrice = 1000 * 175 = 175000
        assertThat(result.getMarketValue())
                .isEqualByComparingTo(new BigDecimal("175000.00"));

        // unrealizedGainLoss = marketValue - costBasis = 175000 - 150000 = 25000
        assertThat(result.getUnrealizedGainLoss())
                .isEqualByComparingTo(new BigDecimal("25000.00"));

        // availableQuantity = quantity - pledgedQuantity = 1000 - 200 = 800
        assertThat(result.getAvailableQuantity())
                .isEqualByComparingTo(new BigDecimal("800"));

        verify(positionRepository).save(pos);
    }

    // ── recordMovement ──────────────────────────────────────────────────

    @Test
    @DisplayName("recordMovement - generates movementRef starting with SM-")
    void recordMovement_generatesMovementRef() {
        when(movementRepository.save(any(SecuritiesMovement.class))).thenAnswer(inv -> {
            SecuritiesMovement m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        SecuritiesMovement movement = SecuritiesMovement.builder()
                .positionId("SP-EXISTING")
                .movementType("BUY")
                .quantity(new BigDecimal("500"))
                .price(new BigDecimal("150.00"))
                .tradeDate(LocalDate.now())
                .build();

        SecuritiesMovement result = service.recordMovement(movement);

        assertThat(result.getMovementRef()).startsWith("SM-");
        assertThat(result.getMovementRef()).hasSize(13); // "SM-" + 10 chars
        verify(movementRepository).save(movement);
    }

    // ── getByPortfolio ──────────────────────────────────────────────────

    @Test
    @DisplayName("getByPortfolio - delegates to findByPortfolioCodeOrderByMarketValueDesc")
    void getByPortfolio_orderedByMarketValue() {
        SecuritiesPosition p1 = new SecuritiesPosition();
        p1.setPortfolioCode("PF-001");
        p1.setMarketValue(new BigDecimal("500000"));

        SecuritiesPosition p2 = new SecuritiesPosition();
        p2.setPortfolioCode("PF-001");
        p2.setMarketValue(new BigDecimal("200000"));

        when(positionRepository.findByPortfolioCodeOrderByMarketValueDesc("PF-001"))
                .thenReturn(List.of(p1, p2));

        List<SecuritiesPosition> result = service.getByPortfolio("PF-001");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMarketValue())
                .isGreaterThan(result.get(1).getMarketValue());
        verify(positionRepository).findByPortfolioCodeOrderByMarketValueDesc("PF-001");
    }
}
