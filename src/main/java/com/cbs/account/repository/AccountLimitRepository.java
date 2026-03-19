package com.cbs.account.repository;

import com.cbs.account.entity.AccountLimit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountLimitRepository extends JpaRepository<AccountLimit, Long> {

    List<AccountLimit> findByAccountId(Long accountId);

    Optional<AccountLimit> findByAccountIdAndLimitType(Long accountId, String limitType);
}
