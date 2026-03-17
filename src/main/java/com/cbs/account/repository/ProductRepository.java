package com.cbs.account.repository;

import com.cbs.account.entity.Product;
import com.cbs.account.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findByCode(String code);

    boolean existsByCode(String code);

    List<Product> findByProductCategoryAndIsActiveTrue(ProductCategory category);

    List<Product> findByIsActiveTrueOrderByProductCategoryAscNameAsc();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.interestTiers WHERE p.code = :code")
    Optional<Product> findByCodeWithTiers(@Param("code") String code);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.interestTiers WHERE p.id = :id")
    Optional<Product> findByIdWithTiers(@Param("id") Long id);
}
