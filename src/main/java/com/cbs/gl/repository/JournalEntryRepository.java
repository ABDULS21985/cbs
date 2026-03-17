package com.cbs.gl.repository;

import com.cbs.gl.entity.JournalEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    Optional<JournalEntry> findByJournalNumber(String journalNumber);
    Page<JournalEntry> findBySourceModuleAndSourceRef(String module, String ref, Pageable pageable);
    Page<JournalEntry> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<JournalEntry> findByPostingDateBetweenOrderByPostingDateDesc(java.time.LocalDate from, java.time.LocalDate to, Pageable pageable);
    @Query(value = "SELECT nextval('cbs.journal_seq')", nativeQuery = true)
    Long getNextJournalSequence();
}
