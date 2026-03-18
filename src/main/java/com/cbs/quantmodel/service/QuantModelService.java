package com.cbs.quantmodel.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.quantmodel.entity.ModelBacktest;
import com.cbs.quantmodel.entity.QuantModel;
import com.cbs.quantmodel.repository.ModelBacktestRepository;
import com.cbs.quantmodel.repository.QuantModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class QuantModelService {

    private final QuantModelRepository modelRepository;
    private final ModelBacktestRepository backtestRepository;

    @Transactional
    public QuantModel register(QuantModel model) {
        model.setModelCode("QM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        model.setStatus("DEVELOPMENT");
        return modelRepository.save(model);
    }

    @Transactional
    public QuantModel approve(String modelCode) {
        QuantModel model = getByCode(modelCode);
        if (!"APPROVED".equals(model.getValidationResult())) {
            throw new BusinessException("Quant model " + modelCode + " validation_result must be APPROVED to approve; current: " + model.getValidationResult());
        }
        model.setStatus("APPROVED");
        model.setLastValidatedAt(Instant.now());
        return modelRepository.save(model);
    }

    @Transactional
    public QuantModel promote(String modelCode) {
        QuantModel model = getByCode(modelCode);
        if (!"APPROVED".equals(model.getStatus())) {
            throw new BusinessException("Quant model " + modelCode + " must be APPROVED to promote to production; current status: " + model.getStatus());
        }
        model.setStatus("PRODUCTION");
        return modelRepository.save(model);
    }

    @Transactional
    public QuantModel retire(String modelCode) {
        QuantModel model = getByCode(modelCode);
        model.setStatus("RETIRED");
        return modelRepository.save(model);
    }

    @Transactional
    public ModelBacktest recordBacktest(ModelBacktest backtest) {
        backtest.setBacktestRef("BT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (backtest.getSampleSize() != null && backtest.getSampleSize() > 0 && backtest.getBreachCount() != null) {
            BigDecimal breachPct = BigDecimal.valueOf(backtest.getBreachCount())
                    .divide(BigDecimal.valueOf(backtest.getSampleSize()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            backtest.setBreachPct(breachPct);
        }
        return backtestRepository.save(backtest);
    }

    public List<QuantModel> getByType(String modelType) {
        return modelRepository.findByModelTypeAndStatusOrderByModelNameAsc(modelType, "PRODUCTION");
    }

    public List<QuantModel> getDueForReview() {
        return modelRepository.findByNextReviewDateBeforeAndStatusIn(LocalDate.now(), List.of("APPROVED", "PRODUCTION"));
    }

    public List<ModelBacktest> getBacktests(String modelCode) {
        QuantModel model = getByCode(modelCode);
        return backtestRepository.findByModelIdOrderByRunAtDesc(model.getId());
    }

    private QuantModel getByCode(String code) {
        return modelRepository.findByModelCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("QuantModel", "modelCode", code));
    }
}
