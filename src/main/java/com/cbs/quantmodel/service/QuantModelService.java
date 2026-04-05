package com.cbs.quantmodel.service;

import com.cbs.common.audit.CurrentActorProvider;
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
import org.springframework.util.StringUtils;

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

    private static final BigDecimal BREACH_THRESHOLD_PCT = new BigDecimal("5.0");

    private final QuantModelRepository modelRepository;
    private final ModelBacktestRepository backtestRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public QuantModel register(QuantModel model) {
        if (!StringUtils.hasText(model.getModelName())) {
            throw new BusinessException("modelName is required", "MISSING_MODEL_NAME");
        }
        if (!StringUtils.hasText(model.getModelType())) {
            throw new BusinessException("modelType is required", "MISSING_MODEL_TYPE");
        }
        model.setModelCode("QM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        model.setStatus("DEVELOPMENT");
        QuantModel saved = modelRepository.save(model);
        log.info("AUDIT: Quant model registered by {}: code={}, name={}, type={}",
                currentActorProvider.getCurrentActor(), saved.getModelCode(), saved.getModelName(), saved.getModelType());
        return saved;
    }

    @Transactional
    public QuantModel approve(String modelCode) {
        QuantModel model = getByCode(modelCode);
        if (!"APPROVED".equals(model.getValidationResult())) {
            throw new BusinessException("Quant model " + modelCode + " validation_result must be APPROVED to approve; current: " + model.getValidationResult(), "VALIDATION_NOT_APPROVED");
        }
        model.setStatus("APPROVED");
        model.setLastValidatedAt(Instant.now());
        log.info("AUDIT: Quant model approved by {}: code={}", currentActorProvider.getCurrentActor(), modelCode);
        return modelRepository.save(model);
    }

    @Transactional
    public QuantModel promote(String modelCode) {
        QuantModel model = getByCode(modelCode);
        if (!"APPROVED".equals(model.getStatus())) {
            throw new BusinessException("Quant model " + modelCode + " must be APPROVED to promote to production; current status: " + model.getStatus(), "INVALID_STATE");
        }
        model.setStatus("PRODUCTION");
        log.info("AUDIT: Quant model promoted to production by {}: code={}", currentActorProvider.getCurrentActor(), modelCode);
        return modelRepository.save(model);
    }

    @Transactional
    public QuantModel retire(String modelCode) {
        QuantModel model = getByCode(modelCode);
        // State guard: cannot retire from DEVELOPMENT
        if ("RETIRED".equals(model.getStatus())) {
            throw new BusinessException("Quant model " + modelCode + " is already RETIRED", "ALREADY_RETIRED");
        }

        // Check for active dependencies: if model is in PRODUCTION, warn about dependent systems
        if ("PRODUCTION".equals(model.getStatus())) {
            log.warn("AUDIT: Retiring PRODUCTION quant model {}: ensure dependent systems are migrated", modelCode);
        }

        model.setStatus("RETIRED");
        log.info("AUDIT: Quant model retired by {}: code={}, previousStatus={}",
                currentActorProvider.getCurrentActor(), modelCode, model.getStatus());
        return modelRepository.save(model);
    }

    @Transactional
    public ModelBacktest recordBacktest(ModelBacktest backtest) {
        if (backtest.getModelId() == null) {
            throw new BusinessException("modelId is required", "MISSING_MODEL_ID");
        }
        backtest.setBacktestRef("BT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (backtest.getSampleSize() != null && backtest.getSampleSize() > 0 && backtest.getBreachCount() != null) {
            BigDecimal breachPct = BigDecimal.valueOf(backtest.getBreachCount())
                    .divide(BigDecimal.valueOf(backtest.getSampleSize()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            backtest.setBreachPct(breachPct);

            // Backtest threshold alerting
            if (breachPct.compareTo(BREACH_THRESHOLD_PCT) > 0) {
                log.warn("AUDIT: Backtest breach threshold exceeded for model {}: breachPct={}% (threshold={}%)",
                        backtest.getModelId(), breachPct, BREACH_THRESHOLD_PCT);
            }
        }
        ModelBacktest saved = backtestRepository.save(backtest);
        log.info("AUDIT: Backtest recorded by {}: ref={}, modelId={}, sampleSize={}, breachCount={}",
                currentActorProvider.getCurrentActor(), saved.getBacktestRef(), saved.getModelId(),
                saved.getSampleSize(), saved.getBreachCount());
        return saved;
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
