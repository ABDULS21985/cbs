package com.cbs.tradingmodel.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.tradingmodel.entity.TradingModel;
import com.cbs.tradingmodel.repository.TradingModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public TradingModel registerModel(TradingModel model) {
        model.setModelCode("TM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        model.setStatus("DEVELOPMENT");
        TradingModel saved = modelRepository.save(model);
        log.info("Trading model registered: code={}, purpose={}", saved.getModelCode(), saved.getModelPurpose());
        return saved;
    }

    @Transactional
    public TradingModel submitForValidation(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        model.setStatus("VALIDATION");
        log.info("Model {} submitted for validation", model.getModelCode());
        return modelRepository.save(model);
    }

    @Transactional
    public TradingModel deployToProduction(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        if (!"APPROVED".equals(model.getValidationResult())) {
            throw new BusinessException("Model must be APPROVED before deployment to production");
        }
        model.setStatus("PRODUCTION");
        model.setProductionDeployedAt(Instant.now());
        log.info("Model {} deployed to production", model.getModelCode());
        return modelRepository.save(model);
    }

    @Transactional
    public TradingModel retireModel(Long modelId) {
        TradingModel model = findModelOrThrow(modelId);
        model.setStatus("RETIRED");
        log.info("Model {} retired", model.getModelCode());
        return modelRepository.save(model);
    }

    @Transactional
    public TradingModel calibrateModel(Long modelId, String quality) {
        TradingModel model = findModelOrThrow(modelId);
        model.setLastCalibratedAt(Instant.now());
        model.setCalibrationQuality(quality);
        log.info("Model {} calibrated with quality={}", model.getModelCode(), quality);
        return modelRepository.save(model);
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
