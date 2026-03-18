package com.cbs.treasuryanalytics.service;
import com.cbs.treasuryanalytics.entity.TreasuryAnalyticsSnapshot;
import com.cbs.treasuryanalytics.repository.TreasuryAnalyticsSnapshotRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class TreasuryAnalyticsService {
    private final TreasuryAnalyticsSnapshotRepository snapshotRepository;
    @Transactional public TreasuryAnalyticsSnapshot record(TreasuryAnalyticsSnapshot snapshot) { return snapshotRepository.save(snapshot); }
    public List<TreasuryAnalyticsSnapshot> getHistory(String currency) { return snapshotRepository.findByCurrencyOrderBySnapshotDateDesc(currency); }
    public Optional<TreasuryAnalyticsSnapshot> getLatest(String currency) { return snapshotRepository.findBySnapshotDateAndCurrency(LocalDate.now(), currency); }
}
