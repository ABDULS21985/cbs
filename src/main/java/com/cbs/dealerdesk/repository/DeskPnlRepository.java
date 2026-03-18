package com.cbs.dealerdesk.repository;

import com.cbs.dealerdesk.entity.DeskPnl;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeskPnlRepository extends JpaRepository<DeskPnl, Long> {
    Optional<DeskPnl> findFirstByDeskIdOrderByPnlDateDesc(Long deskId);
    List<DeskPnl> findByDeskIdAndPnlDateBetween(Long deskId, LocalDate from, LocalDate to);
}
