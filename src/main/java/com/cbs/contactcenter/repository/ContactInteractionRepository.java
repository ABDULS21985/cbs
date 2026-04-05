package com.cbs.contactcenter.repository;
import com.cbs.contactcenter.entity.ContactInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface ContactInteractionRepository extends JpaRepository<ContactInteraction, Long> {
    Optional<ContactInteraction> findByInteractionId(String id);
    List<ContactInteraction> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<ContactInteraction> findByAgentIdOrderByStartedAtDesc(String agentId);
    List<ContactInteraction> findByAgentIdAndStatusOrderByStartedAtDesc(String agentId, String status);
    List<ContactInteraction> findByCenterIdAndStatusOrderByStartedAtDesc(Long centerId, String status);
    long countByAgentIdAndStatus(String agentId, String status);
}
