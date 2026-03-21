package com.cbs.aml.repository;

import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
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

    @Query(value = """
            SELECT a.*
            FROM cbs.aml_alert a
            WHERE EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(a.trigger_transactions) refs(ref)
                WHERE refs.ref = :transactionRef
            )
            ORDER BY a.created_at DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<AmlAlert> findLatestByTransactionRef(@Param("transactionRef") String transactionRef);

    @Query(value = """
            SELECT a.*
            FROM cbs.aml_alert a
            WHERE jsonb_array_length(COALESCE(a.trigger_transactions, '[]'::jsonb)) > 0
            ORDER BY a.created_at DESC
            """, nativeQuery = true)
    List<AmlAlert> findAllFlaggedAlerts();
}
