package com.cbs.goal.repository;

import com.cbs.goal.entity.SavingsGoalTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SavingsGoalTransactionRepository extends JpaRepository<SavingsGoalTransaction, Long> {

    Page<SavingsGoalTransaction> findBySavingsGoalIdOrderByCreatedAtDesc(Long savingsGoalId, Pageable pageable);
}
