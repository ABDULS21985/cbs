package com.cbs.suitability.repository;
import com.cbs.suitability.entity.ClientRiskProfile; import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface ClientRiskProfileRepository extends JpaRepository<ClientRiskProfile, Long> {
    Optional<ClientRiskProfile> findByProfileCode(String profileCode);
    Optional<ClientRiskProfile> findByCustomerIdAndStatus(Long customerId, String status);
    List<ClientRiskProfile> findByNextReviewDateBeforeAndStatus(LocalDate date, String status);
}
