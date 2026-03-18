package com.cbs.salesplan.repository;
import com.cbs.salesplan.entity.SalesTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SalesTargetRepository extends JpaRepository<SalesTarget, Long> {
    Optional<SalesTarget> findByTargetCode(String code);
    List<SalesTarget> findByOfficerIdAndStatusOrderByPeriodStartDesc(String officerId, String status);
}
