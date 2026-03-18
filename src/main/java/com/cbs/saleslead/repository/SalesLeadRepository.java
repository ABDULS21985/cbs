package com.cbs.saleslead.repository;
import com.cbs.saleslead.entity.SalesLead;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface SalesLeadRepository extends JpaRepository<SalesLead, Long> {
    Optional<SalesLead> findByLeadNumber(String number);
    List<SalesLead> findByAssignedToAndStageInOrderByLeadScoreDesc(String assignedTo, List<String> stages);
    List<SalesLead> findByStageOrderByLeadScoreDesc(String stage);
}
