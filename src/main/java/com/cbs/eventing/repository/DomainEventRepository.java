package com.cbs.eventing.repository;

import com.cbs.eventing.entity.DomainEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DomainEventRepository extends JpaRepository<DomainEvent, Long> {
    List<DomainEvent> findByAggregateTypeAndAggregateIdOrderBySequenceNumberAsc(String type, Long id);
    @Query("SELECT e FROM DomainEvent e WHERE e.published = false ORDER BY e.id ASC")
    List<DomainEvent> findUnpublished();
    Page<DomainEvent> findByEventTypeOrderByCreatedAtDesc(String eventType, Pageable pageable);
    @Query(value = "SELECT nextval('cbs.event_seq')", nativeQuery = true)
    Long getNextSequence();
}
