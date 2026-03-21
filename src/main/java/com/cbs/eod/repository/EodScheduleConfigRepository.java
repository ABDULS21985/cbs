package com.cbs.eod.repository;

import com.cbs.eod.entity.EodScheduleConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EodScheduleConfigRepository extends JpaRepository<EodScheduleConfig, Long> {
}
