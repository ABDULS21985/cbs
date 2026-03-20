package com.cbs.finstrument.repository;

import com.cbs.finstrument.entity.FinancialInstrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface FinancialInstrumentRepository extends JpaRepository<FinancialInstrument, Long> {
    Optional<FinancialInstrument> findByInstrumentCode(String code);
    Optional<FinancialInstrument> findByIsin(String isin);
    List<FinancialInstrument> findByInstrumentTypeAndIsActiveTrueOrderByInstrumentNameAsc(String type);
    List<FinancialInstrument> findByAssetClassAndIsActiveTrueOrderByInstrumentNameAsc(String assetClass);

    @Query("""
            SELECT i
            FROM FinancialInstrument i
            WHERE i.isActive = true
            AND (
                LOWER(i.instrumentCode) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(i.instrumentName) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(COALESCE(i.ticker, '')) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(COALESCE(i.isin, '')) LIKE LOWER(CONCAT('%', :query, '%'))
            )
            ORDER BY i.instrumentName ASC
            """)
    List<FinancialInstrument> searchActive(String query);
}
