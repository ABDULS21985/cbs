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

    Page<SavingsGoal> findByCustomerId(Long customerId, Pageable pageable);

    Page<SavingsGoal> findByCustomerIdAndStatus(Long customerId, GoalStatus status, Pageable pageable);

    @Query("SELECT g FROM SavingsGoal g WHERE g.autoDebitEnabled = true AND g.status = 'ACTIVE' AND g.nextAutoDebitDate <= :date")
    List<SavingsGoal> findDueForAutoDebit(@Param("date") LocalDate date);

    @Query("SELECT g FROM SavingsGoal g JOIN FETCH g.account JOIN FETCH g.customer WHERE g.id = :id")
    Optional<SavingsGoal> findByIdWithDetails(@Param("id") Long id);

    @Query(value = "SELECT nextval('cbs.savings_goal_seq')", nativeQuery = true)
    Long getNextGoalSequence();
}
