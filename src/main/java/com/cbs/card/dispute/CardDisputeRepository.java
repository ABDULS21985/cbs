package com.cbs.card.dispute;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardDisputeRepository extends JpaRepository<CardDispute, Long> {
    Optional<CardDispute> findByDisputeRef(String ref);
    Page<CardDispute> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<CardDispute> findByStatusOrderByCreatedAtDesc(DisputeStatus status, Pageable pageable);
    Page<CardDispute> findByAssignedToAndStatusInOrderByFilingDeadlineAsc(String assignedTo, List<DisputeStatus> statuses, Pageable pageable);

    @Query("SELECT d FROM CardDispute d WHERE d.status IN ('INITIATED','INVESTIGATION') AND d.filingDeadline <= :date AND d.isSlaBreached = false")
    List<CardDispute> findSlaBreached(@Param("date") LocalDate date);

    long countByStatus(DisputeStatus status);
    long countByIsSlaBreachedTrue();

    @Query(value = "SELECT nextval('cbs.dispute_seq')", nativeQuery = true)
    Long getNextDisputeSequence();
}
