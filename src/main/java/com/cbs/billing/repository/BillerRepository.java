package com.cbs.billing.repository;

import com.cbs.billing.entity.Biller;
import com.cbs.billing.entity.BillerCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillerRepository extends JpaRepository<Biller, Long> {
    Optional<Biller> findByBillerCode(String billerCode);
    List<Biller> findByBillerCategoryAndIsActiveTrue(BillerCategory category);
    List<Biller> findByIsActiveTrueOrderByBillerNameAsc();
    List<Biller> findAllByOrderByBillerNameAsc();
}
