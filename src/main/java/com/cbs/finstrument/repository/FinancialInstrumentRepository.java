package com.cbs.finstrument.repository;

import com.cbs.finstrument.entity.FinancialInstrument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinancialInstrumentRepository extends JpaRepository<FinancialInstrument, Long> {
    Optional<FinancialInstrument> findByInstrumentCode(String code);
    Optional<FinancialInstrument> findByIsin(String isin);
    List<FinancialInstrument> findByInstrumentTypeAndIsActiveTrueOrderByInstrumentNameAsc(String type);
    List<FinancialInstrument> findByAssetClassAndIsActiveTrueOrderByInstrumentNameAsc(String assetClass);
}
