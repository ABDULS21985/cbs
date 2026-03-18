package com.cbs.custbehavior.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import com.cbs.custbehavior.repository.CustomerBehaviorModelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CustomerBehaviorService {

    private final CustomerBehaviorModelRepository repository;

    @Transactional
    public CustomerBehaviorModel score(CustomerBehaviorModel model) {
        model.setModelCode("CBM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        model.setScoreBand(deriveScoreBand(model.getScore()));
        model.setIsCurrent(true);

        // Mark previous model of same type for same customer as not current
        Optional<CustomerBehaviorModel> previous = repository
                .findByCustomerIdAndModelTypeAndIsCurrentTrue(model.getCustomerId(), model.getModelType());
        previous.ifPresent(prev -> {
            prev.setIsCurrent(false);
            repository.save(prev);
        });

        return repository.save(model);
    }

    public List<CustomerBehaviorModel> getCurrentModels(Long customerId) {
        return repository.findByCustomerIdAndIsCurrentTrueOrderByScoreDesc(customerId);
    }

    public CustomerBehaviorModel getByType(Long customerId, String modelType) {
        return repository.findByCustomerIdAndModelTypeAndIsCurrentTrue(customerId, modelType)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerBehaviorModel", "customerId/modelType", customerId + "/" + modelType));
    }

    private String deriveScoreBand(BigDecimal score) {
        double s = score.doubleValue();
        if (s >= 80) return "VERY_HIGH";
        if (s >= 60) return "HIGH";
        if (s >= 40) return "MEDIUM";
        if (s >= 20) return "LOW";
        return "VERY_LOW";
    }
}
