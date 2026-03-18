package com.cbs.tdframework.repository;

import com.cbs.tdframework.entity.TdFrameworkSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TdFrameworkSummaryRepository extends JpaRepository<TdFrameworkSummary, Long> {
    Optional<TdFrameworkSummary> findFirstByAgreementIdOrderBySnapshotDateDesc(Long agreementId);
    List<TdFrameworkSummary> findByAgreementIdOrderBySnapshotDateDesc(Long agreementId);
}
