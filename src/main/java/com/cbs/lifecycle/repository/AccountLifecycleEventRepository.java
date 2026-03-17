package com.cbs.lifecycle.repository;

import com.cbs.lifecycle.entity.AccountLifecycleEvent;
import com.cbs.lifecycle.entity.LifecycleEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountLifecycleEventRepository extends JpaRepository<AccountLifecycleEvent, Long> {

    Page<AccountLifecycleEvent> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);

    List<AccountLifecycleEvent> findByAccountIdAndEventType(Long accountId, LifecycleEventType eventType);
}
