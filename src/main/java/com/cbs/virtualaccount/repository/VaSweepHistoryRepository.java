package com.cbs.virtualaccount.repository;

import com.cbs.virtualaccount.entity.VaSweepHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VaSweepHistoryRepository extends JpaRepository<VaSweepHistory, Long> {
    List<VaSweepHistory> findByVaIdOrderBySweptAtDesc(Long vaId);
}
