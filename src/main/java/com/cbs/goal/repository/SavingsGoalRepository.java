package com.cbs.goal.repository;

import com.cbs.goal.entity.GoalStatus;
import com.cbs.goal.entity.SavingsGoal;
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
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {

    Optional<SavingsGoal> findByGoalNumber(String goalNumber);

    // ── Legacy per-customer helpers (still used internally) ──────────────────

    Page<SavingsGoal> findByCustomerId(Long customerId, Pageable pageable);

    Page<SavingsGoal> findByCustomerIdAndStatus(Long customerId, GoalStatus status, Pageable pageable);

    @Query("SELECT g FROM SavingsGoal g WHERE g.autoDebitEnabled = true AND g.status = 'ACTIVE' " +
           "AND g.nextAutoDebitDate <= :date")
    List<SavingsGoal> findDueForAutoDebit(@Param("date") LocalDate date);

    // ── Single-record lookup with eager fetch ─────────────────────────────────

    /** Used by all single-goal endpoints; avoids LazyInitializationException in toResponse(). */
    @Query("SELECT g FROM SavingsGoal g JOIN FETCH g.account JOIN FETCH g.customer WHERE g.id = :id")
    Optional<SavingsGoal> findByIdWithDetails(@Param("id") Long id);

    // ── Two-query pagination: step 1 — ID pages (SQL-level pagination, no joins) ─

    /** All goals, ordered newest-first. */
    @Query(value = "SELECT g.id FROM SavingsGoal g ORDER BY g.createdAt DESC",
           countQuery = "SELECT COUNT(g) FROM SavingsGoal g")
    Page<Long> findAllIds(Pageable pageable);

    /** Goals filtered by status, ordered newest-first. */
    @Query(value = "SELECT g.id FROM SavingsGoal g WHERE g.status = :status ORDER BY g.createdAt DESC",
           countQuery = "SELECT COUNT(g) FROM SavingsGoal g WHERE g.status = :status")
    Page<Long> findIdsByStatus(@Param("status") GoalStatus status, Pageable pageable);

    /** Goals matching a free-text search on goal name or persisted customer-name fields. */
    @Query(value = "SELECT g.id FROM SavingsGoal g " +
                   "WHERE LOWER(g.goalName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                   "   OR LOWER(COALESCE(g.customer.registeredName, g.customer.tradingName, " +
                   "       CONCAT(CONCAT(COALESCE(g.customer.firstName, ''), ' '), COALESCE(g.customer.lastName, '')))) " +
                   "      LIKE LOWER(CONCAT('%', :search, '%')) " +
                   "ORDER BY g.createdAt DESC",
           countQuery = "SELECT COUNT(g) FROM SavingsGoal g " +
                        "WHERE LOWER(g.goalName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "   OR LOWER(COALESCE(g.customer.registeredName, g.customer.tradingName, " +
                        "       CONCAT(CONCAT(COALESCE(g.customer.firstName, ''), ' '), COALESCE(g.customer.lastName, '')))) " +
                        "      LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Long> searchIds(@Param("search") String search, Pageable pageable);

    /** Goals matching both a status filter and a free-text search. */
    @Query(value = "SELECT g.id FROM SavingsGoal g " +
                   "WHERE g.status = :status " +
                   "  AND (LOWER(g.goalName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                   "    OR LOWER(COALESCE(g.customer.registeredName, g.customer.tradingName, " +
                   "        CONCAT(CONCAT(COALESCE(g.customer.firstName, ''), ' '), COALESCE(g.customer.lastName, '')))) " +
                   "       LIKE LOWER(CONCAT('%', :search, '%'))) " +
                   "ORDER BY g.createdAt DESC",
           countQuery = "SELECT COUNT(g) FROM SavingsGoal g " +
                        "WHERE g.status = :status " +
                        "  AND (LOWER(g.goalName) LIKE LOWER(CONCAT('%', :search, '%')) " +
                        "    OR LOWER(COALESCE(g.customer.registeredName, g.customer.tradingName, " +
                        "        CONCAT(CONCAT(COALESCE(g.customer.firstName, ''), ' '), COALESCE(g.customer.lastName, '')))) " +
                        "       LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Long> searchIdsByStatus(@Param("status") GoalStatus status, @Param("search") String search, Pageable pageable);

    /** Goals belonging to a specific customer, ordered newest-first. */
    @Query(value = "SELECT g.id FROM SavingsGoal g WHERE g.customer.id = :customerId ORDER BY g.createdAt DESC",
           countQuery = "SELECT COUNT(g) FROM SavingsGoal g WHERE g.customer.id = :customerId")
    Page<Long> findIdsByCustomerId(@Param("customerId") Long customerId, Pageable pageable);

    // ── Two-query pagination: step 2 — batch fetch by IDs with JOIN FETCH ────

    /**
     * Load a specific set of goals (already paginated via their IDs) with account
     * and customer eagerly fetched. The IN-list prevents a LazyInitializationException
     * in toResponse() and avoids the HHH90003004 in-memory-pagination warning that
     * occurs when JOIN FETCH is combined with setFirstResult/setMaxResults.
     *
     * NOTE: Spring Data does NOT guarantee result ordering when using IN — the
     *       caller is responsible for re-ordering by the original ID list.
     */
    @Query("SELECT g FROM SavingsGoal g JOIN FETCH g.account JOIN FETCH g.customer WHERE g.id IN :ids")
    List<SavingsGoal> findByIdsWithDetails(@Param("ids") List<Long> ids);

    @Query(value = "SELECT nextval('cbs.savings_goal_seq')", nativeQuery = true)
    Long getNextGoalSequence();
}
