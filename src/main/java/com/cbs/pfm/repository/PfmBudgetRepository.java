package com.cbs.pfm.repository;
import com.cbs.pfm.entity.PfmBudget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface PfmBudgetRepository extends JpaRepository<PfmBudget, Long> {
    List<PfmBudget> findByCustomerIdAndBudgetMonthOrderByCategoryIdAsc(Long customerId, LocalDate month);
    List<PfmBudget> findByCustomerIdOrderByBudgetMonthDescCategoryIdAsc(Long customerId);
}
