package com.cbs.centralcashhandling.repository;
import com.cbs.centralcashhandling.entity.CashMovement; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {
    Optional<CashMovement> findByMovementRef(String ref);
    List<CashMovement> findByFromVaultCodeOrToVaultCodeOrderByScheduledDateDesc(String from, String to);
}
