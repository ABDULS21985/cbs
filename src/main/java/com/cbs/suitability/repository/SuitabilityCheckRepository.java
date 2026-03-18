package com.cbs.suitability.repository;
import com.cbs.suitability.entity.SuitabilityCheck; import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant; import java.util.List; import java.util.Optional;
public interface SuitabilityCheckRepository extends JpaRepository<SuitabilityCheck, Long> {
    Optional<SuitabilityCheck> findByCheckRef(String checkRef);
    List<SuitabilityCheck> findByCustomerIdOrderByCheckedAtDesc(Long customerId);
    List<SuitabilityCheck> findByOverrideAppliedAndCheckedAtBetween(Boolean overrideApplied, Instant from, Instant to);
}
