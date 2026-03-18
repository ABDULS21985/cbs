package com.cbs.productcatalog.repository;

import com.cbs.productcatalog.entity.ProductCatalogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductCatalogEntryRepository extends JpaRepository<ProductCatalogEntry, Long> {
    Optional<ProductCatalogEntry> findByProductCode(String code);
    List<ProductCatalogEntry> findByProductFamilyAndStatusOrderByProductNameAsc(String family, String status);
    List<ProductCatalogEntry> findByStatusOrderByProductFamilyAscProductNameAsc(String status);
    List<ProductCatalogEntry> findByIsShariaCompliantTrueAndStatusOrderByProductNameAsc(String status);
}
