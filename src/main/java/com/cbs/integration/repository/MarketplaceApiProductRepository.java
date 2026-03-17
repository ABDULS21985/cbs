package com.cbs.integration.repository;

import com.cbs.integration.entity.MarketplaceApiProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MarketplaceApiProductRepository extends JpaRepository<MarketplaceApiProduct, Long> {
    Optional<MarketplaceApiProduct> findByProductCode(String productCode);
    List<MarketplaceApiProduct> findByStatusOrderByProductNameAsc(String status);
    List<MarketplaceApiProduct> findByProductCategoryAndStatusOrderByProductNameAsc(String category, String status);
}
