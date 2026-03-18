package com.cbs.custody.repository;

import com.cbs.custody.entity.CustodyAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CustodyAccountRepository extends JpaRepository<CustodyAccount, Long> {
    Optional<CustodyAccount> findByAccountCode(String code);
    List<CustodyAccount> findByCustomerIdAndStatusOrderByAccountNameAsc(Long customerId, String status);
}
