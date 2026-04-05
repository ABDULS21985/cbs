package com.cbs.gl.repository;

import com.cbs.gl.entity.JournalEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface JournalEntryRepository extends JpaRepository<JournalEntry, Long> {
    @Override
    @EntityGraph(attributePaths = "lines")
    Optional<JournalEntry> findById(Long id);

    @EntityGraph(attributePaths = "lines")
    Optional<JournalEntry> findByJournalNumber(String journalNumber);
    @EntityGraph(attributePaths = "lines")
    Page<JournalEntry> findBySourceModuleAndSourceRef(String module, String ref, Pageable pageable);
    @EntityGraph(attributePaths = "lines")
    Page<JournalEntry> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    @EntityGraph(attributePaths = "lines")
    Page<JournalEntry> findByPostingDateBetweenOrderByPostingDateDesc(java.time.LocalDate from, java.time.LocalDate to, Pageable pageable);
        boolean existsBySourceRef(String sourceRef);
    @Query(value = "SELECT nextval('cbs.journal_seq')", nativeQuery = true)
    Long getNextJournalSequence();

    @Query("SELECT DISTINCT j FROM JournalEntry j JOIN j.lines l WHERE l.glCode = :glCode AND j.postingDate BETWEEN :from AND :to ORDER BY j.postingDate DESC")
    Page<JournalEntry> findByGlCodeAndDateRange(String glCode, java.time.LocalDate from, java.time.LocalDate to, Pageable pageable);

    /**
     * Sum net GL postings (debit - credit) for journal lines referencing a specific source ref
     * up to and including a given date. Used for reconciliation break detail.
     */
    @Query("""
            SELECT COALESCE(SUM(l.localDebit - l.localCredit), 0)
            FROM JournalEntry j JOIN j.lines l
            WHERE j.sourceRef = :sourceRef
            AND j.status = 'POSTED'
            AND j.postingDate <= :asOfDate
            """)
    BigDecimal sumNetPostingsByAccountRef(@Param("sourceRef") String sourceRef,
                                         @Param("asOfDate") java.time.LocalDate asOfDate);
}
