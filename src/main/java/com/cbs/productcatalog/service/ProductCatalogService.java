package com.cbs.productcatalog.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductCatalogService {

    private final ProductCatalogEntryRepository catalogRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public ProductCatalogEntry create(ProductCatalogEntry entry) {
        // Validation
        if (!StringUtils.hasText(entry.getProductCode())) {
            throw new BusinessException("productCode is required", "MISSING_PRODUCT_CODE");
        }
        if (!StringUtils.hasText(entry.getProductName())) {
            throw new BusinessException("productName is required", "MISSING_PRODUCT_NAME");
        }
        if (!StringUtils.hasText(entry.getProductFamily())) {
            throw new BusinessException("productFamily is required", "MISSING_PRODUCT_FAMILY");
        }

        // Duplicate product code check
        catalogRepository.findByProductCode(entry.getProductCode()).ifPresent(existing -> {
            throw new BusinessException("Product code already exists: " + entry.getProductCode(), "DUPLICATE_PRODUCT_CODE");
        });

        if (entry.getStatus() == null) {
            entry.setStatus("DRAFT");
        }
        ProductCatalogEntry saved = catalogRepository.save(entry);
        log.info("AUDIT: Product catalog entry created by {}: code={}, name={}, family={}",
                currentActorProvider.getCurrentActor(), saved.getProductCode(), saved.getProductName(), saved.getProductFamily());
        return saved;
    }

    @Transactional
    public ProductCatalogEntry update(String productCode, ProductCatalogEntry updates) {
        ProductCatalogEntry entry = catalogRepository.findByProductCode(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCatalogEntry", "productCode", productCode));
        if ("RETIRED".equals(entry.getStatus())) {
            throw new BusinessException("Cannot update a RETIRED product", "PRODUCT_RETIRED");
        }
        if (StringUtils.hasText(updates.getProductName())) entry.setProductName(updates.getProductName());
        if (StringUtils.hasText(updates.getDescription())) entry.setDescription(updates.getDescription());
        if (StringUtils.hasText(updates.getTargetSegment())) entry.setTargetSegment(updates.getTargetSegment());
        if (updates.getAvailableChannels() != null) entry.setAvailableChannels(updates.getAvailableChannels());
        if (updates.getFeeSchedule() != null) entry.setFeeSchedule(updates.getFeeSchedule());
        if (updates.getInterestRates() != null) entry.setInterestRates(updates.getInterestRates());
        if (updates.getIsShariaCompliant() != null) entry.setIsShariaCompliant(updates.getIsShariaCompliant());
        ProductCatalogEntry saved = catalogRepository.save(entry);
        log.info("AUDIT: Product catalog entry updated by {}: code={}", currentActorProvider.getCurrentActor(), productCode);
        return saved;
    }

    @Transactional
    public ProductCatalogEntry launch(String productCode) {
        ProductCatalogEntry e = catalogRepository.findByProductCode(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCatalogEntry", "productCode", productCode));

        // Pre-launch validation
        if (!"DRAFT".equals(e.getStatus()) && !"APPROVED".equals(e.getStatus())) {
            throw new BusinessException("Product must be in DRAFT or APPROVED status to launch; current: " + e.getStatus(), "INVALID_STATE");
        }
        if (!StringUtils.hasText(e.getDescription())) {
            throw new BusinessException("Product description is required before launch", "MISSING_DESCRIPTION");
        }

        e.setStatus("ACTIVE");
        e.setLaunchedAt(Instant.now());
        log.info("AUDIT: Product launched by {}: code={}, name={}", currentActorProvider.getCurrentActor(), productCode, e.getProductName());
        return catalogRepository.save(e);
    }

    @Transactional
    public ProductCatalogEntry retire(String productCode) {
        ProductCatalogEntry e = catalogRepository.findByProductCode(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCatalogEntry", "productCode", productCode));
        if ("RETIRED".equals(e.getStatus())) {
            throw new BusinessException("Product is already RETIRED", "ALREADY_RETIRED");
        }
        e.setStatus("RETIRED");
        e.setRetiredAt(Instant.now());
        log.info("AUDIT: Product retired by {}: code={}", currentActorProvider.getCurrentActor(), productCode);
        return catalogRepository.save(e);
    }

    public List<ProductCatalogEntry> getByFamily(String family) {
        return catalogRepository.findByProductFamilyAndStatusOrderByProductNameAsc(family, "ACTIVE");
    }

    public List<ProductCatalogEntry> getAll() {
        return catalogRepository.findByStatusOrderByProductFamilyAscProductNameAsc("ACTIVE");
    }

    public List<ProductCatalogEntry> getShariaCompliant() {
        return catalogRepository.findByIsShariaCompliantTrueAndStatusOrderByProductNameAsc("ACTIVE");
    }
}
