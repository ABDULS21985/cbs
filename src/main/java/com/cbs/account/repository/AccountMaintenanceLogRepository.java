package com.cbs.account.repository;

import com.cbs.account.entity.AccountMaintenanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountMaintenanceLogRepository extends JpaRepository<AccountMaintenanceLog, Long> {

    List<AccountMaintenanceLog> findByAccountIdOrderByCreatedAtDesc(Long accountId);
}
