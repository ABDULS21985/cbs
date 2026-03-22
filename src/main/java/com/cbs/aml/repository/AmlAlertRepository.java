package com.cbs.aml.repository;

import com.cbs.aml.entity.AmlAlert;
import com.cbs.aml.entity.AmlAlertStatus;
import com.cbs.aml.entity.AmlRuleCategory;
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

    @Query("SELECT a FROM AmlAlert a JOIN FETCH a.rule LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.account WHERE a.status = :status ORDER BY a.createdAt DESC")
    List<AmlAlert> findByStatusWithDetailsOrdered(@Param("status") AmlAlertStatus status);

    @Query(value = "SELECT a FROM AmlAlert a JOIN FETCH a.rule LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.account WHERE a.status = :status ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM AmlAlert a WHERE a.status = :status")
    Page<AmlAlert> findByStatusOrderByCreatedAtDesc(@Param("status") AmlAlertStatus status, Pageable pageable);

    @Query(value = "SELECT a FROM AmlAlert a JOIN FETCH a.rule LEFT JOIN FETCH a.customer WHERE a.customer.id = :customerId ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM AmlAlert a WHERE a.customer.id = :customerId")
    Page<AmlAlert> findByCustomerIdOrderByCreatedAtDesc(@Param("customerId") Long customerId, Pageable pageable);

    Page<AmlAlert> findByAssignedToOrderByCreatedAtDesc(String assignedTo, Pageable pageable);
    long countByStatus(AmlAlertStatus status);

    @Query("SELECT a FROM AmlAlert a JOIN FETCH a.rule LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.account WHERE a.id = :id")
    Optional<AmlAlert> findByIdWithDetails(@Param("id") Long id);

    /** Paginated list with all relations loaded to avoid lazy-loading issues during serialization. */
    @Query(value = "SELECT a FROM AmlAlert a JOIN FETCH a.rule LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.account ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM AmlAlert a")
    Page<AmlAlert> findAllWithDetails(Pageable pageable);

    /** CTR / category-filtered list — used for the CTR tab (LARGE_CASH alerts). */
    @Query(value = "SELECT a FROM AmlAlert a JOIN FETCH a.rule r LEFT JOIN FETCH a.customer LEFT JOIN FETCH a.account WHERE r.ruleCategory = :category ORDER BY a.createdAt DESC",
           countQuery = "SELECT count(a) FROM AmlAlert a JOIN a.rule r WHERE r.ruleCategory = :category")
    Page<AmlAlert> findByRuleCategory(@Param("category") AmlRuleCategory category, Pageable pageable);
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
