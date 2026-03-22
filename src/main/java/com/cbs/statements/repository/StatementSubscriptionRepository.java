package com.cbs.statements.repository;

import com.cbs.statements.entity.StatementSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StatementSubscriptionRepository extends JpaRepository<StatementSubscription, Long> {

    List<StatementSubscription> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<StatementSubscription> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    List<StatementSubscription> findByAccountIdAndActiveTrue(Long accountId);

    /** Find active subscriptions whose nextDelivery is due (today or earlier). */
    List<StatementSubscription> findByActiveTrueAndNextDeliveryLessThanEqual(LocalDate date);
}
