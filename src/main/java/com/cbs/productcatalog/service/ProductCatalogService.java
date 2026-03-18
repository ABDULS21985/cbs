package com.cbs.productcatalog.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productcatalog.entity.ProductCatalogEntry;
import com.cbs.productcatalog.repository.ProductCatalogEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ProductCatalogService {

    private final ProductCatalogEntryRepository catalogRepository;

    @Transactional
    public ProductCatalogEntry create(ProductCatalogEntry entry) {
        return catalogRepository.save(entry);
    }

    @Transactional
    public ProductCatalogEntry launch(String productCode) {
        ProductCatalogEntry e = catalogRepository.findByProductCode(productCode)
                .orElseThrow(() -> new ResourceNotFoundException("ProductCatalogEntry", "productCode", productCode));
        e.setStatus("ACTIVE");
        e.setLaunchedAt(Instant.now());
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
