package com.cbs.salesplan.repository;
import com.cbs.salesplan.entity.SalesPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SalesPlanRepository extends JpaRepository<SalesPlan, Long> {
    Optional<SalesPlan> findByPlanCode(String code);
    List<SalesPlan> findByRegionAndStatusOrderByPeriodStartDesc(String region, String status);
}
