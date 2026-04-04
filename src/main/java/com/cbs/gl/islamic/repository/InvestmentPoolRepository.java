package com.cbs.gl.islamic.repository;

import com.cbs.gl.islamic.entity.InvestmentPool;
import com.cbs.gl.islamic.entity.PoolStatus;
import com.cbs.gl.islamic.entity.PoolType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvestmentPoolRepository extends JpaRepository<InvestmentPool, Long> {
    Optional<InvestmentPool> findByPoolCode(String poolCode);
    List<InvestmentPool> findByPoolTypeAndStatus(PoolType type, PoolStatus status);
    List<InvestmentPool> findByCurrencyCode(String currencyCode);
    List<InvestmentPool> findByStatus(PoolStatus status);
}
