package com.cbs.centralcashhandling.repository;
import com.cbs.centralcashhandling.entity.CashVault; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CashVaultRepository extends JpaRepository<CashVault, Long> {
    Optional<CashVault> findByVaultCode(String code); List<CashVault> findByVaultTypeAndStatusOrderByVaultNameAsc(String type, String status);
}
