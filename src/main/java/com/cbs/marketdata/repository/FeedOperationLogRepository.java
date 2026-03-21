package com.cbs.marketdata.repository;

import com.cbs.marketdata.entity.FeedOperationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedOperationLogRepository extends JpaRepository<FeedOperationLog, Long> {
    List<FeedOperationLog> findByFeedIdOrderByTimestampDesc(Long feedId);
    Page<FeedOperationLog> findByFeedIdOrderByTimestampDesc(Long feedId, Pageable pageable);
}
