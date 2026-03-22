package com.cbs.vault.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.vault.entity.*;
import com.cbs.vault.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class VaultService {

    private final VaultRepository vaultRepository;
    private final VaultTransactionRepository txnRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public Vault createVault(String vaultCode, String vaultName, String branchCode, VaultType vaultType,
                               String currencyCode, BigDecimal minimumBalance, BigDecimal maximumBalance,
                               BigDecimal insuranceLimit, String custodian) {
        Vault vault = Vault.builder()
                .vaultCode(vaultCode).vaultName(vaultName).branchCode(branchCode)
                .vaultType(vaultType).currencyCode(currencyCode)
                .minimumBalance(minimumBalance).maximumBalance(maximumBalance)
                .insuranceLimit(insuranceLimit).custodian(custodian).build();
        Vault saved = vaultRepository.save(vault);
        log.info("Vault created: code={}, type={}, branch={}", vaultCode, vaultType, branchCode);
        return saved;
    }

    @Transactional
    public VaultTransaction cashIn(Long vaultId, BigDecimal amount, String reference, String narration) {
        Vault vault = findVaultOrThrow(vaultId);
        String performedBy = currentActorProvider.getCurrentActor();
        vault.cashIn(amount);
        if (vault.getMaximumBalance() != null && vault.getCurrentBalance().compareTo(vault.getMaximumBalance()) > 0) {
            log.warn("Vault {} exceeds maximum balance: current={}, max={}", vault.getVaultCode(), vault.getCurrentBalance(), vault.getMaximumBalance());
        }
        vaultRepository.save(vault);
        return logTransaction(vault, "CASH_IN", amount, null, reference, narration, performedBy);
    }

    @Transactional
    public VaultTransaction cashOut(Long vaultId, BigDecimal amount, String reference, String narration) {
        Vault vault = findVaultOrThrow(vaultId);
        String performedBy = currentActorProvider.getCurrentActor();
        if (vault.getCurrentBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient vault balance", "INSUFFICIENT_VAULT_BALANCE");
        }
        vault.cashOut(amount);
        vaultRepository.save(vault);
        return logTransaction(vault, "CASH_OUT", amount, null, reference, narration, performedBy);
    }

    @Transactional
    public void vaultTransfer(Long fromVaultId, Long toVaultId, BigDecimal amount) {
        Vault from = findVaultOrThrow(fromVaultId);
        Vault to = findVaultOrThrow(toVaultId);
        String performedBy = currentActorProvider.getCurrentActor();

        if (from.getCurrentBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient source vault balance", "INSUFFICIENT_VAULT_BALANCE");
        }

        from.cashOut(amount);
        to.cashIn(amount);
        vaultRepository.save(from);
        vaultRepository.save(to);

        logTransaction(from, "VAULT_TRANSFER", amount, to, null, "Transfer to " + to.getVaultCode(), performedBy);
        logTransaction(to, "VAULT_TRANSFER", amount, from, null, "Transfer from " + from.getVaultCode(), performedBy);

        log.info("Vault transfer: {} → {}, amount={}", from.getVaultCode(), to.getVaultCode(), amount);
    }

    public Vault getVault(Long id) { return findVaultOrThrow(id); }

    public List<Vault> getVaults(String branchCode) {
        if (branchCode != null && !branchCode.isBlank()) {
            return vaultRepository.findByBranchCodeAndStatus(branchCode, "ACTIVE");
        }
        return vaultRepository.findByStatus("ACTIVE");
    }

    public List<Vault> getBranchVaults(String branchCode) {
        return vaultRepository.findByBranchCodeAndStatus(branchCode, "ACTIVE");
    }

    public Page<VaultTransaction> getTransactions(Pageable pageable) {
        return txnRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<VaultTransaction> getTransactions(Long vaultId, Pageable pageable) {
        return txnRepository.findByVaultIdOrderByCreatedAtDesc(vaultId, pageable);
    }

    private Vault findVaultOrThrow(Long id) {
        return vaultRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Vault", "id", id));
    }

    private VaultTransaction logTransaction(Vault vault, String type, BigDecimal amount,
                                              Vault counterparty, String reference, String narration, String performedBy) {
        VaultTransaction txn = VaultTransaction.builder()
                .vault(vault).transactionType(type).amount(amount)
                .runningBalance(vault.getCurrentBalance()).currencyCode(vault.getCurrencyCode())
                .counterpartyVault(counterparty).reference(reference).narration(narration)
                .performedBy(performedBy).build();
        return txnRepository.save(txn);
    }
}
