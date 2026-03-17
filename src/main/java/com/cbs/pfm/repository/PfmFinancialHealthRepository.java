package com.cbs.pfm.repository;
import com.cbs.pfm.entity.PfmFinancialHealth;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PfmFinancialHealthRepository extends JpaRepository<PfmFinancialHealth, Long> {
    Optional<PfmFinancialHealth> findFirstByCustomerIdOrderByAssessmentDateDesc(Long customerId);
    List<PfmFinancialHealth> findByCustomerIdOrderByAssessmentDateDesc(Long customerId);
}
