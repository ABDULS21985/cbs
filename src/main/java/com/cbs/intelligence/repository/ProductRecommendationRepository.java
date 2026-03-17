package com.cbs.intelligence.repository;

import com.cbs.intelligence.entity.ProductRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRecommendationRepository extends JpaRepository<ProductRecommendation, Long> {
    List<ProductRecommendation> findByCustomerIdAndStatusOrderByScoreDesc(Long customerId, String status);
    List<ProductRecommendation> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
