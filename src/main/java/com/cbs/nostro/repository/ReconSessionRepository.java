package com.cbs.nostro.repository;

import com.cbs.nostro.entity.ReconSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReconSessionRepository extends JpaRepository<ReconSession, Long> {

    Optional<ReconSession> findBySessionRef(String sessionRef);

    Page<ReconSession> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<ReconSession> findByReconDateBetweenOrderByCreatedAtDesc(LocalDate from, LocalDate to);

    Page<ReconSession> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
