package com.cbs.vault.repository;

import com.cbs.vault.entity.Vault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VaultRepository extends JpaRepository<Vault, Long> {
    Optional<Vault> findByVaultCode(String vaultCode);
    List<Vault> findByBranchCodeAndStatus(String branchCode, String status);
    List<Vault> findByStatus(String status);
}
