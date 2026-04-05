package com.cbs.shariahcompliance.repository;

import com.cbs.shariahcompliance.entity.CharityFundLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CharityFundLedgerEntryRepository extends JpaRepository<CharityFundLedgerEntry, Long> {

    Optional<CharityFundLedgerEntry> findTopByOrderByEntryDateDescIdDesc();

        Optional<CharityFundLedgerEntry> findFirstByJournalRefOrderByCreatedAtDesc(String journalRef);

    Page<CharityFundLedgerEntry> findByEntryDateBetweenOrderByEntryDateDescIdDesc(LocalDate fromDate, LocalDate toDate, Pageable pageable);

    List<CharityFundLedgerEntry> findByEntryDateBetweenOrderByEntryDateAscIdAsc(LocalDate fromDate, LocalDate toDate);

    @Query("""
            select coalesce(sum(case when e.entryType = 'OUTFLOW' then e.amount else -e.amount end), 0)
            from CharityFundLedgerEntry e
            where e.entryType in ('OUTFLOW','REVERSAL')
            """)
    BigDecimal sumOutflows();

    @Query("""
            select coalesce(sum(case when e.entryType = 'INFLOW' then e.amount else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.sourceType = :sourceType
              and e.entryDate between :fromDate and :toDate
            """)
    BigDecimal sumInflowsBySourceTypeBetween(String sourceType, LocalDate fromDate, LocalDate toDate);

    @Query("""
            select coalesce(sum(case when e.entryType = 'INFLOW' then e.amount else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.sourceType = :sourceType
              and e.sourceContractType = :sourceContractType
              and e.entryDate between :fromDate and :toDate
            """)
    BigDecimal sumInflowsBySourceTypeAndSourceContractTypeBetween(String sourceType,
                                                                  String sourceContractType,
                                                                  LocalDate fromDate,
                                                                  LocalDate toDate);

    @Query("""
            select coalesce(sum(case
                when e.entryType = 'INFLOW' then e.amount
                when e.entryType = 'REVERSAL' then -e.amount
                else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.sourceType = :sourceType
              and e.entryDate between :fromDate and :toDate
            """)
    BigDecimal sumNetInflowsBySourceTypeBetween(String sourceType, LocalDate fromDate, LocalDate toDate);

    @Query("""
            select coalesce(sum(case
                when e.entryType = 'INFLOW' then e.amount
                when e.entryType = 'REVERSAL' then -e.amount
                else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.sourceType = :sourceType
              and e.sourceContractType = :sourceContractType
              and e.entryDate between :fromDate and :toDate
            """)
    BigDecimal sumNetInflowsBySourceTypeAndSourceContractTypeBetween(String sourceType,
                                                                     String sourceContractType,
                                                                     LocalDate fromDate,
                                                                     LocalDate toDate);

    @Query("""
            select coalesce(sum(case
                when e.entryType = 'INFLOW' then e.amount
                when e.entryType in ('OUTFLOW','REVERSAL') then -e.amount
                else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.entryDate < :date
            """)
    BigDecimal openingBalanceBefore(LocalDate date);

    @Query("""
            select coalesce(sum(case
                when e.entryType = 'INFLOW' then e.amount
                when e.entryType in ('OUTFLOW','REVERSAL') then -e.amount
                else 0 end), 0)
            from CharityFundLedgerEntry e
            """)
    BigDecimal currentNetBalance();

    @Query("""
            select coalesce(sum(case
                when e.entryType = 'INFLOW' then e.amount
                when e.entryType in ('OUTFLOW','REVERSAL') then -e.amount
                else 0 end), 0)
            from CharityFundLedgerEntry e
            where e.currencyCode = :currencyCode
            """)
    BigDecimal currentNetBalanceByCurrency(String currencyCode);
}
