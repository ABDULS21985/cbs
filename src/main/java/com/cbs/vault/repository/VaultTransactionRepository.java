package com.cbs.vault.repository;

import com.cbs.vault.entity.VaultTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VaultTransactionRepository extends JpaRepository<VaultTransaction, Long> {
    Page<VaultTransaction> findByVaultIdOrderByCreatedAtDesc(Long vaultId, Pageable pageable);
}
