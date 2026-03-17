package com.cbs.nostro.repository;

import com.cbs.nostro.entity.MatchStatus;
import com.cbs.nostro.entity.NostroReconciliationItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NostroReconciliationItemRepository extends JpaRepository<NostroReconciliationItem, Long> {

    Page<NostroReconciliationItem> findByPositionIdOrderByValueDateDesc(Long positionId, Pageable pageable);

    List<NostroReconciliationItem> findByPositionIdAndMatchStatus(Long positionId, MatchStatus matchStatus);

    @Query("SELECT COUNT(i) FROM NostroReconciliationItem i WHERE i.position.id = :positionId AND i.matchStatus = 'UNMATCHED'")
    int countUnmatchedItems(@Param("positionId") Long positionId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM NostroReconciliationItem i WHERE i.position.id = :positionId AND i.matchStatus = 'UNMATCHED'")
    java.math.BigDecimal sumUnmatchedAmount(@Param("positionId") Long positionId);
}
