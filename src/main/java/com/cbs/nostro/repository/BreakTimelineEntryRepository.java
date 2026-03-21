package com.cbs.nostro.repository;

import com.cbs.nostro.entity.BreakTimelineEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BreakTimelineEntryRepository extends JpaRepository<BreakTimelineEntry, Long> {

    List<BreakTimelineEntry> findByReconBreakIdOrderByTimestampDesc(Long breakId);
}
