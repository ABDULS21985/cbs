package com.cbs.pfm.repository;
import com.cbs.pfm.entity.PfmSpendingCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PfmSpendingCategoryRepository extends JpaRepository<PfmSpendingCategory, Long> {
    List<PfmSpendingCategory> findByIsSystemTrueOrderByCategoryNameAsc();
}
