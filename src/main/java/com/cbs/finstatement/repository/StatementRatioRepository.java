package com.cbs.finstatement.repository;

import com.cbs.finstatement.entity.StatementRatio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StatementRatioRepository extends JpaRepository<StatementRatio, Long> {
    List<StatementRatio> findByStatementIdOrderByRatioCategoryAscRatioNameAsc(Long statementId);
    List<StatementRatio> findByStatementIdAndRatioCategory(Long statementId, String ratioCategory);
}
