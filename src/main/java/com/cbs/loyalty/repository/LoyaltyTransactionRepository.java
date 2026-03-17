package com.cbs.loyalty.repository;
import com.cbs.loyalty.entity.LoyaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, Long> {
    List<LoyaltyTransaction> findByAccountIdOrderByCreatedAtDesc(Long accountId);
}
