package com.cbs.billing.repository;

import com.cbs.billing.entity.Biller;
import com.cbs.billing.entity.BillerCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillerRepository extends JpaRepository<Biller, Long> {
    Optional<Biller> findByBillerCode(String billerCode);
    List<Biller> findByBillerCategoryAndIsActiveTrue(BillerCategory category);
    List<Biller> findByIsActiveTrueOrderByBillerNameAsc();
    List<Biller> findAllByOrderByBillerNameAsc();

    @Query("SELECT b FROM Biller b WHERE b.isActive = true " +
           "AND (LOWER(b.billerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(b.billerCode) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY b.billerName ASC")
    List<Biller> searchByNameOrCode(@Param("query") String query);
}
