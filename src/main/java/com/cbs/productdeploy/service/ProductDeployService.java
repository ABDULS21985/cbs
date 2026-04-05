package com.cbs.productdeploy.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productdeploy.entity.ProductDeployment;
import com.cbs.productdeploy.repository.ProductDeploymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductDeployService {

    private final ProductDeploymentRepository repository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProductDeployment create(ProductDeployment d) {
        d.setDeploymentCode("PD-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        d.setStatus("PLANNED");
        ProductDeployment saved = repository.save(d);
        log.info("AUDIT: Product deployment created by {}: code={}, product={}",
                currentActorProvider.getCurrentActor(), saved.getDeploymentCode(), saved.getProductCode());
        return saved;
    }

    @Transactional
    public ProductDeployment approve(String code) {
        ProductDeployment d = getByCode(code);
        // State guard: PLANNED -> APPROVED
        if (!"PLANNED".equals(d.getStatus())) {
            throw new BusinessException("Deployment must be PLANNED to approve; current status: " + d.getStatus(), "INVALID_STATE");
        }
        d.setStatus("APPROVED");
        log.info("AUDIT: Product deployment approved by {}: code={}", currentActorProvider.getCurrentActor(), code);
        return repository.save(d);
    }

    @Transactional
    public ProductDeployment complete(String code) {
        ProductDeployment d = getByCode(code);
        // State guard: APPROVED -> COMPLETED
        if (!"APPROVED".equals(d.getStatus())) {
            throw new BusinessException("Deployment must be APPROVED to complete; current status: " + d.getStatus(), "INVALID_STATE");
        }
        d.setActualDate(LocalDate.now());
        d.setStatus("COMPLETED");
        log.info("AUDIT: Product deployment completed by {}: code={}, actualDate={}",
                currentActorProvider.getCurrentActor(), code, d.getActualDate());
        return repository.save(d);
    }

    @Transactional
    public ProductDeployment rollback(String code) {
        ProductDeployment d = getByCode(code);
        // State guard: can only rollback COMPLETED or APPROVED deployments
        if (!"COMPLETED".equals(d.getStatus()) && !"APPROVED".equals(d.getStatus())) {
            throw new BusinessException("Deployment must be COMPLETED or APPROVED to rollback; current status: " + d.getStatus(), "INVALID_STATE");
        }
        d.setStatus("ROLLED_BACK");
        log.info("AUDIT: Product deployment rolled back by {}: code={}", currentActorProvider.getCurrentActor(), code);
        return repository.save(d);
    }

    public List<ProductDeployment> getByProduct(String productCode) {
        return repository.findByProductCodeOrderByPlannedDateDesc(productCode);
    }

    public List<ProductDeployment> getInProgress() {
        return repository.findByStatusOrderByPlannedDateAsc("IN_PROGRESS");
    }

    public ProductDeployment getByCode(String code) {
        return repository.findByDeploymentCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ProductDeployment", "deploymentCode", code));
    }
}
