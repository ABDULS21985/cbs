package com.cbs.nostro.repository;

import com.cbs.nostro.entity.StatementImport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatementImportRepository extends JpaRepository<StatementImport, Long> {

    Page<StatementImport> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<StatementImport> findByPositionIdOrderByCreatedAtDesc(Long positionId);

    List<StatementImport> findByAccountNumberAndStatusNot(String accountNumber, String excludeStatus);

    boolean existsByPositionIdAndStatementDateAndStatusNot(
            Long positionId, java.time.LocalDate statementDate, String excludeStatus);
}
