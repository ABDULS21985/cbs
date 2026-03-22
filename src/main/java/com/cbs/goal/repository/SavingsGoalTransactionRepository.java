package com.cbs.goal.repository;

import com.cbs.goal.entity.SavingsGoalTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingsGoalTransactionRepository extends JpaRepository<SavingsGoalTransaction, Long> {

    /**
     * Step 1 of two-query pagination: fetch IDs for the requested page only.
     * No JOIN FETCH here — avoids the HHH90003004 in-memory pagination warning.
     */
    @Query(value = "SELECT t.id FROM SavingsGoalTransaction t WHERE t.savingsGoal.id = :goalId ORDER BY t.createdAt DESC",
           countQuery = "SELECT COUNT(t) FROM SavingsGoalTransaction t WHERE t.savingsGoal.id = :goalId")
    Page<Long> findIdsByGoalId(@Param("goalId") Long goalId, Pageable pageable);

    /**
     * Step 2 of two-query pagination: load the exact rows returned by step 1
     * with sourceAccount eagerly fetched so toTransactionResponse() never
     * triggers a lazy-load outside a transaction.
     */
    @Query("SELECT t FROM SavingsGoalTransaction t LEFT JOIN FETCH t.sourceAccount WHERE t.id IN :ids ORDER BY t.createdAt DESC")
    List<SavingsGoalTransaction> findByIdsWithSourceAccount(@Param("ids") List<Long> ids);
}
