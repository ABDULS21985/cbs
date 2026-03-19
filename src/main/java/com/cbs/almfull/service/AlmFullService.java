package com.cbs.almfull.service;
import com.cbs.almfull.entity.AlmPosition;
import com.cbs.almfull.repository.AlmPositionRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.math.RoundingMode; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AlmFullService {
    private final AlmPositionRepository positionRepository;
    @Transactional
    public AlmPosition calculatePosition(AlmPosition pos) {
        pos.setTotalAssets(pos.getCashAndEquivalents().add(pos.getInterbankPlacements()).add(pos.getSecuritiesHeld())
                .add(pos.getLoansAndAdvances()).add(pos.getFixedAssets()).add(pos.getOtherAssets()));
        pos.setTotalLiabilities(pos.getDemandDeposits().add(pos.getTermDeposits()).add(pos.getInterbankBorrowings())
                .add(pos.getBondsIssued()).add(pos.getOtherLiabilities()));
        pos.setGapAmount(pos.getTotalAssets().subtract(pos.getTotalLiabilities()));
        if (pos.getTotalAssets().signum() != 0)
            pos.setGapRatio(pos.getGapAmount().divide(pos.getTotalAssets(), 4, RoundingMode.HALF_UP));
        if (pos.getDurationAssets() != null && pos.getDurationLiabilities() != null)
            pos.setDurationGap(pos.getDurationAssets().subtract(pos.getDurationLiabilities()));
        AlmPosition saved = positionRepository.save(pos);
        log.info("ALM position: date={}, bucket={}, gap={}, ratio={}", pos.getPositionDate(), pos.getTimeBucket(), pos.getGapAmount(), pos.getGapRatio());
        return saved;
    }
    public List<AlmPosition> getPositions(LocalDate date, String currency) { return positionRepository.findByPositionDateAndCurrencyOrderByTimeBucketAsc(date, currency); }
    public List<AlmPosition> getAllPositions() { return positionRepository.findAll(); }
}
