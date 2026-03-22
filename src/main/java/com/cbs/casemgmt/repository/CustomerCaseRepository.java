package com.cbs.casemgmt.repository;
import com.cbs.casemgmt.entity.CustomerCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import java.util.List; import java.util.Optional;
public interface CustomerCaseRepository extends JpaRepository<CustomerCase, Long>, JpaSpecificationExecutor<CustomerCase> {
    Optional<CustomerCase> findByCaseNumber(String caseNumber);
    List<CustomerCase> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CustomerCase> findByAssignedToAndStatusInOrderBySlaDueAtAsc(String assignedTo, List<String> statuses);
    List<CustomerCase> findByAssignedToAndStatusNotInOrderBySlaDueAtAsc(String assignedTo, List<String> statuses);
    List<CustomerCase> findByStatusOrderByPriorityAscSlaDueAtAsc(String status);
    List<CustomerCase> findByStatusOrderByCreatedAtDesc(String status);
    @Query("SELECT c FROM CustomerCase c WHERE c.slaBreached = false AND c.slaDueAt <= CURRENT_TIMESTAMP AND c.status NOT IN ('RESOLVED','CLOSED')")
    List<CustomerCase> findSlaBreachCandidates();
    @Query("SELECT c FROM CustomerCase c WHERE c.slaBreached = true AND c.status NOT IN ('RESOLVED','CLOSED')")
    List<CustomerCase> findSlaBreachedCases();
}
