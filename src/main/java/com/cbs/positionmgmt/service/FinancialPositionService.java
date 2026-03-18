package com.cbs.positionmgmt.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.positionmgmt.entity.FinancialPosition;
import com.cbs.positionmgmt.repository.FinancialPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class FinancialPositionService {
    private final FinancialPositionRepository repository;

    @Transactional
    public FinancialPosition record(FinancialPosition pos) {
        pos.setPositionCode("FP-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        pos.setNetPosition(pos.getLongPosition().subtract(pos.getShortPosition()));
        if (pos.getPositionLimit() != null && pos.getPositionLimit().compareTo(BigDecimal.ZERO) > 0) {
            pos.setLimitUtilizationPct(pos.getNetPosition().abs()
                    .divide(pos.getPositionLimit(), 2, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100")));
            pos.setLimitBreach(pos.getNetPosition().abs().compareTo(pos.getPositionLimit()) > 0);
        }
        return repository.save(pos);
    }

    public List<FinancialPosition> getByType(String positionType, LocalDate date) {
        return repository.findByPositionTypeAndPositionDateOrderByNetPositionDesc(positionType, date);
    }

    public List<FinancialPosition> getBreaches() {
        return repository.findByLimitBreachTrueOrderByPositionDateDesc();
    }
}
