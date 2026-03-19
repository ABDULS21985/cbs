package com.cbs.account.repository;

import com.cbs.account.entity.AccountHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountHoldRepository extends JpaRepository<AccountHold, Long> {

    List<AccountHold> findByAccountIdOrderByCreatedAtDesc(Long accountId);

    List<AccountHold> findByAccountIdAndStatus(Long accountId, String status);

    Optional<AccountHold> findByReference(String reference);

    @Query(value = "SELECT nextval('cbs.account_hold_seq')", nativeQuery = true)
    Long getNextHoldSequence();
}
