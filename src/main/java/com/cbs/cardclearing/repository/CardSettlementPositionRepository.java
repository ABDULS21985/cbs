package com.cbs.cardclearing.repository;
import com.cbs.cardclearing.entity.CardSettlementPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List;
public interface CardSettlementPositionRepository extends JpaRepository<CardSettlementPosition, Long> {
    List<CardSettlementPosition> findBySettlementDateAndNetworkOrderByCounterpartyNameAsc(LocalDate date, String network);
    List<CardSettlementPosition> findByStatusOrderBySettlementDateDesc(String status);
}
