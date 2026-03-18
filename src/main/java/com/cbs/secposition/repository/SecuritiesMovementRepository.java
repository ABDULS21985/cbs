package com.cbs.secposition.repository;

import com.cbs.secposition.entity.SecuritiesMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SecuritiesMovementRepository extends JpaRepository<SecuritiesMovement, Long> {
    List<SecuritiesMovement> findByPositionIdOrderByTradeDateDesc(String positionId);
    List<SecuritiesMovement> findByMovementTypeAndStatusOrderByTradeDateDesc(String movementType, String status);
}
