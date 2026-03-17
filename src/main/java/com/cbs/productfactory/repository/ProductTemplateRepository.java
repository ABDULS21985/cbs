package com.cbs.productfactory.repository;

import com.cbs.productfactory.entity.ProductTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface ProductTemplateRepository extends JpaRepository<ProductTemplate, Long> {
    Optional<ProductTemplate> findByTemplateCode(String code);
    List<ProductTemplate> findByProductCategoryAndStatusOrderByTemplateNameAsc(String category, String status);
    List<ProductTemplate> findByStatusOrderByProductCategoryAscTemplateNameAsc(String status);
}
