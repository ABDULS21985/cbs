package com.cbs.nostro.repository;

import com.cbs.nostro.entity.AutoFetchConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AutoFetchConfigRepository extends JpaRepository<AutoFetchConfig, Long> {

    List<AutoFetchConfig> findByStatusOrderByBankNameAsc(String status);

    List<AutoFetchConfig> findAllByOrderByBankNameAsc();
}
