package com.cbs.productfactory.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productfactory.entity.ProductTemplate;
import com.cbs.productfactory.repository.ProductTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ProductFactoryService {

    private final ProductTemplateRepository templateRepository;

    @Transactional
    public ProductTemplate createTemplate(ProductTemplate template) {
        templateRepository.findByTemplateCode(template.getTemplateCode()).ifPresent(t -> {
            throw new BusinessException("Template code exists: " + template.getTemplateCode(), "DUPLICATE_TEMPLATE");
        });
        template.setStatus("DRAFT");
        ProductTemplate saved = templateRepository.save(template);
        log.info("Product template created: code={}, category={}", template.getTemplateCode(), template.getProductCategory());
        return saved;
    }

    @Transactional
    public ProductTemplate submitForApproval(Long templateId) {
        ProductTemplate template = findOrThrow(templateId);
        if (!"DRAFT".equals(template.getStatus())) throw new BusinessException("Template must be in DRAFT", "NOT_DRAFT");
        template.setStatus("PENDING_APPROVAL");
        return templateRepository.save(template);
    }

    @Transactional
    public ProductTemplate approveTemplate(Long templateId, String approvedBy) {
        ProductTemplate template = findOrThrow(templateId);
        if (!"PENDING_APPROVAL".equals(template.getStatus())) throw new BusinessException("Template not pending approval", "NOT_PENDING");
        template.setStatus("APPROVED");
        template.setApprovedBy(approvedBy);
        template.setApprovedAt(Instant.now());
        log.info("Product template approved: code={}, by={}", template.getTemplateCode(), approvedBy);
        return templateRepository.save(template);
    }

    @Transactional
    public ProductTemplate activateTemplate(Long templateId) {
        ProductTemplate template = findOrThrow(templateId);
        if (!"APPROVED".equals(template.getStatus())) throw new BusinessException("Template must be APPROVED first", "NOT_APPROVED");
        template.setStatus("ACTIVE");
        template.setActivatedAt(Instant.now());
        log.info("Product template activated: code={}", template.getTemplateCode());
        return templateRepository.save(template);
    }

    /** Create a new version of an existing template (clone + increment version) */
    @Transactional
    public ProductTemplate createNewVersion(Long existingTemplateId) {
        ProductTemplate existing = findOrThrow(existingTemplateId);
        ProductTemplate newVersion = ProductTemplate.builder()
                .templateCode(existing.getTemplateCode() + "-v" + (existing.getTemplateVersion() + 1))
                .templateName(existing.getTemplateName()).productCategory(existing.getProductCategory())
                .interestConfig(existing.getInterestConfig()).feeConfig(existing.getFeeConfig())
                .limitConfig(existing.getLimitConfig()).eligibilityRules(existing.getEligibilityRules())
                .lifecycleRules(existing.getLifecycleRules()).glMapping(existing.getGlMapping())
                .templateVersion(existing.getTemplateVersion() + 1).parentTemplateId(existing.getId())
                .status("DRAFT").build();
        return templateRepository.save(newVersion);
    }

    public List<ProductTemplate> getActiveTemplates() { return templateRepository.findByStatusOrderByProductCategoryAscTemplateNameAsc("ACTIVE"); }
    public List<ProductTemplate> getByCategory(String category) { return templateRepository.findByProductCategoryAndStatusOrderByTemplateNameAsc(category, "ACTIVE"); }

    private ProductTemplate findOrThrow(Long id) {
        return templateRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("ProductTemplate", "id", id));
    }
}
