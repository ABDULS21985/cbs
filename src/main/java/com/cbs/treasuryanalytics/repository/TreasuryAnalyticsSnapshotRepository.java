package com.cbs.treasuryanalytics.repository;
import com.cbs.treasuryanalytics.entity.TreasuryAnalyticsSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface TreasuryAnalyticsSnapshotRepository extends JpaRepository<TreasuryAnalyticsSnapshot, Long> {
    Optional<TreasuryAnalyticsSnapshot> findBySnapshotDateAndCurrency(LocalDate date, String currency);
    List<TreasuryAnalyticsSnapshot> findByCurrencyOrderBySnapshotDateDesc(String currency);
}
