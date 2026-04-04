package com.cbs.rulesengine.repository;

import com.cbs.rulesengine.entity.DecisionTableRow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DecisionTableRowRepository extends JpaRepository<DecisionTableRow, Long> {

    List<DecisionTableRow> findByDecisionTableIdOrderByRowNumberAsc(Long decisionTableId);

    List<DecisionTableRow> findByDecisionTableIdAndIsActiveTrueOrderByRowNumberAsc(Long decisionTableId);

    void deleteByDecisionTableId(Long decisionTableId);
}
