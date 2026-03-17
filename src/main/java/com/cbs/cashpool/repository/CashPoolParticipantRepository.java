package com.cbs.cashpool.repository;
import com.cbs.cashpool.entity.CashPoolParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CashPoolParticipantRepository extends JpaRepository<CashPoolParticipant, Long> {
    List<CashPoolParticipant> findByPoolIdAndIsActiveTrueOrderByPriorityAsc(Long poolId);
}
