package com.cbs.aml.repository;

import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AmlAlertRepository extends JpaRepository<AmlAlert, Long> {
    Optional<AmlAlert> findByAlertRef(String alertRef);
    Page<AmlAlert> findByStatusOrderByCreatedAtDesc(AmlAlertStatus status, Pageable pageable);
    Page<AmlAlert> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);
    Page<AmlAlert> findByAssignedToOrderByCreatedAtDesc(String assignedTo, Pageable pageable);
    long countByStatus(AmlAlertStatus status);
    @Query("SELECT a FROM AmlAlert a JOIN FETCH a.rule JOIN FETCH a.customer WHERE a.id = :id")
    Optional<AmlAlert> findByIdWithDetails(@Param("id") Long id);
    @Query(value = "SELECT nextval('cbs.aml_alert_seq')", nativeQuery = true)
    Long getNextAlertSequence();
}
