package com.cbs.wadiah.repository;

import com.cbs.wadiah.entity.WadiahStatementRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WadiahStatementRecordRepository extends JpaRepository<WadiahStatementRecord, Long> {

    Optional<WadiahStatementRecord> findByStatementRef(String statementRef);

    List<WadiahStatementRecord> findByAccountIdOrderByCreatedAtDesc(Long accountId);
}
