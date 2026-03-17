package com.cbs.atmmgmt.repository;

import com.cbs.atmmgmt.entity.AtmJournalEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AtmJournalEntryRepository extends JpaRepository<AtmJournalEntry, Long> {
    Page<AtmJournalEntry> findByTerminalIdOrderByCreatedAtDesc(String terminalId, Pageable pageable);
}
