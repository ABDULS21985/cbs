package com.cbs.loyalty.repository;
import com.cbs.loyalty.entity.LoyaltyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface LoyaltyAccountRepository extends JpaRepository<LoyaltyAccount, Long> {
    Optional<LoyaltyAccount> findByLoyaltyNumber(String loyaltyNumber);
    List<LoyaltyAccount> findByCustomerIdAndStatus(Long customerId, String status);
}
