package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.WadiahStatementConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WadiahStatementConfigRepository extends JpaRepository<WadiahStatementConfig, Long> {

    Optional<WadiahStatementConfig> findByWadiahAccountId(Long wadiahAccountId);
}
