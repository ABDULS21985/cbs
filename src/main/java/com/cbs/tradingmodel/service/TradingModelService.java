package com.cbs.tradingmodel.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tradingmodel.entity.TradingModel;
import com.cbs.tradingmodel.repository.TradingModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TradingModelService {

    private final TradingModelRepository modelRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public TradingModel registerModel(TradingModel model) {
        if (!StringUtils.hasText(model.getModelName())) {
            throw new BusinessException("Model name is required", "MISSING_MODEL_NAME");
        }
        if (!StringUtils.hasText(model.getModelPurpose())) {
            throw new BusinessException("Model purpose is required", "MISSING_MODEL_PURPOSE");
        }
        model.setModelCode("TM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        model.setStatus("DEVELOPMENT");
        if (model.getModelVersion() == null) model.setModelVersion("1.0");
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Trading model registered: code={}, purpose={}, actor={}",
                saved.getModelCode(), saved.getModelPurpose(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel submitForValidation(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        if (!"DEVELOPMENT".equals(model.getStatus())) {
            throw new BusinessException("Only DEVELOPMENT models can be submitted for validation; current: " + model.getStatus(),
                    "INVALID_MODEL_STATUS");
        }

        // Actual validation logic
        List<String> validationErrors = new java.util.ArrayList<>();

        // Check model has required metadata
        if (!StringUtils.hasText(model.getModelPurpose())) {
            validationErrors.add("Model purpose is not defined");
        }
        if (model.getInputParameters() == null || model.getInputParameters().isEmpty()) {
            validationErrors.add("Model must have defined input parameters");
        }
        if (!StringUtils.hasText(model.getMethodology())) {
            validationErrors.add("Model methodology is not documented");
        }

        // Check calibration is recent (within 90 days)
        if (model.getLastCalibratedAt() == null) {
            validationErrors.add("Model has never been calibrated");
        } else {
            long daysSinceCalibration = java.time.Duration.between(model.getLastCalibratedAt(), Instant.now()).toDays();
            if (daysSinceCalibration > 90) {
                validationErrors.add("Model calibration is stale (" + daysSinceCalibration + " days old, max 90)");
            }
        }

        if (!validationErrors.isEmpty()) {
            model.setValidationResult("REJECTED");
            model.setStatus("DEVELOPMENT"); // stay in development
            TradingModel saved = modelRepository.save(model);
            log.info("AUDIT: Model validation failed: code={}, errors={}", model.getModelCode(), validationErrors);
            return saved;
        }

        model.setStatus("VALIDATION");
        model.setValidationResult("PENDING");
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Model {} submitted for validation, actor={}", model.getModelCode(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel approveValidation(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        if (!"VALIDATION".equals(model.getStatus())) {
            throw new BusinessException("Model must be in VALIDATION status to approve", "INVALID_MODEL_STATUS");
        }
        model.setValidationResult("APPROVED");
        model.setLastValidatedAt(Instant.now());
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Model validated: code={}, by={}", model.getModelCode(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel deployToProduction(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        // Fix: check both status and validation result
        if (!"VALIDATION".equals(model.getStatus()) && !"DEVELOPMENT".equals(model.getStatus())) {
            throw new BusinessException("Model must be in VALIDATION status for deployment", "INVALID_MODEL_STATUS");
        }
        if (!"APPROVED".equals(model.getValidationResult())) {
            throw new BusinessException("Model must be APPROVED before deployment to production", "MODEL_NOT_APPROVED");
        }
        model.setStatus("PRODUCTION");
        model.setProductionDeployedAt(Instant.now());
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Model {} deployed to production (v{}), actor={}",
                model.getModelCode(), saved.getModelVersion(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel recordPerformance(Long modelId, BigDecimal actualReturn, BigDecimal predictedReturn) {
        TradingModel model = findModelOrThrow(modelId);
        if (!"PRODUCTION".equals(model.getStatus())) {
            throw new BusinessException("Performance can only be tracked for PRODUCTION models", "INVALID_MODEL_STATUS");
        }
        if (actualReturn != null && predictedReturn != null && predictedReturn.compareTo(BigDecimal.ZERO) != 0) {
            BigDecimal trackingError = actualReturn.subtract(predictedReturn).abs();
            // Store tracking error in performance metrics
            if (model.getPerformanceMetrics() == null) {
                model.setPerformanceMetrics(new java.util.HashMap<>());
            }
            model.getPerformanceMetrics().put("lastTrackingError", trackingError.toString());
            model.getPerformanceMetrics().put("lastPerformanceDate", LocalDate.now().toString());

            // Flag models with high tracking error for review
            if (trackingError.compareTo(new BigDecimal("0.05")) > 0) {
                model.getPerformanceMetrics().put("performanceFlag", "HIGH_TRACKING_ERROR");
                log.info("AUDIT: High tracking error detected: model={}, error={}", model.getModelCode(), trackingError);
            }
        }
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Performance recorded: model={}, actual={}, predicted={}, actor={}",
                model.getModelCode(), actualReturn, predictedReturn, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel retireModel(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        if ("RETIRED".equals(model.getStatus())) {
            throw new BusinessException("Model is already retired", "ALREADY_RETIRED");
        }
        model.setStatus("RETIRED");
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Model {} retired, actor={}", model.getModelCode(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public TradingModel calibrateModel(Long modelId, String quality) {
        TradingModel model = findModelOrThrow(modelId);
        if ("RETIRED".equals(model.getStatus())) {
            throw new BusinessException("Cannot calibrate a retired model", "MODEL_RETIRED");
        }
        if (!StringUtils.hasText(quality)) {
            throw new BusinessException("Calibration quality assessment is required", "MISSING_QUALITY");
        }
        model.setLastCalibratedAt(Instant.now());
        model.setCalibrationQuality(quality);
        TradingModel saved = modelRepository.save(model);
        log.info("AUDIT: Model {} calibrated with quality={}, actor={}",
                model.getModelCode(), quality, currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<TradingModel> getModelInventory() {
        return modelRepository.findAllByOrderByStatusAsc();
    }

    public List<TradingModel> getModelsForReview() {
        return modelRepository.findModelsForReview(LocalDate.now());
    }

    private TradingModel findModelOrThrow(Long modelId) {
        return modelRepository.findById(modelId)
                .orElseThrow(() -> new ResourceNotFoundException("TradingModel", "id", modelId));
    }
}
