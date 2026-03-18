package com.cbs.quantmodel.repository;

import com.cbs.quantmodel.entity.ModelBacktest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ModelBacktestRepository extends JpaRepository<ModelBacktest, Long> {
    Optional<ModelBacktest> findByBacktestRef(String backtestRef);
    List<ModelBacktest> findByModelIdOrderByRunAtDesc(Long modelId);
    List<ModelBacktest> findByResultStatusOrderByRunAtDesc(String resultStatus);
}
