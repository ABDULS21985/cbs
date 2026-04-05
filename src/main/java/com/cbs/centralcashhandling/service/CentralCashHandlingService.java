package com.cbs.centralcashhandling.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.centralcashhandling.entity.*;
import com.cbs.centralcashhandling.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CentralCashHandlingService {

    private static final BigDecimal DUAL_CUSTODY_THRESHOLD = new BigDecimal("1000000");

    private final CashVaultRepository vaultRepository;
    private final CashMovementRepository movementRepository;
    private final CurrentActorProvider currentActorProvider;

    // ── Vault Registration ──────────────────────────────────────────────────

    @Transactional
    public CashVault registerVault(CashVault vault) {
        if (!StringUtils.hasText(vault.getVaultName())) {
            throw new BusinessException("Vault name is required", "MISSING_VAULT_NAME");
        }
        if (!StringUtils.hasText(vault.getVaultType())) {
            throw new BusinessException("Vault type is required", "MISSING_VAULT_TYPE");
        }
        vault.setVaultCode("VLT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (vault.getTotalBalance() == null) {
            vault.setTotalBalance(BigDecimal.ZERO);
        }
        if (vault.getDenominationBreakdown() == null) {
            vault.setDenominationBreakdown(new LinkedHashMap<>());
        }
        if (vault.getDualControl() == null) {
            vault.setDualControl(true);
        }
        vault.setStatus("ACTIVE");
        CashVault saved = vaultRepository.save(vault);
        log.info("Vault registered: code={}, type={}, branch={}, actor={}",
                saved.getVaultCode(), saved.getVaultType(), saved.getBranchId(),
                currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Cash Movement ───────────────────────────────────────────────────────

    @Transactional
    public CashMovement recordMovement(CashMovement movement) {
        // Validate amount
        if (movement.getAmount() == null) {
            throw new BusinessException("Movement amount is required", "MISSING_AMOUNT");
        }
        if (movement.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Movement amount must be greater than zero", "INVALID_AMOUNT");
        }
        if (!StringUtils.hasText(movement.getMovementType())) {
            throw new BusinessException("Movement type is required", "MISSING_MOVEMENT_TYPE");
        }
        if (!StringUtils.hasText(movement.getFromVaultCode()) && !StringUtils.hasText(movement.getToVaultCode())) {
            throw new BusinessException("At least one of fromVaultCode or toVaultCode is required", "MISSING_VAULT_CODES");
        }

        // Dual custody enforcement for movements above threshold
        if (movement.getAmount().compareTo(DUAL_CUSTODY_THRESHOLD) > 0) {
            if (!StringUtils.hasText(movement.getAuthorizedBy())) {
                throw new BusinessException(
                        String.format("Movements above %s require dual custody authorization (authorizedBy is missing)",
                                DUAL_CUSTODY_THRESHOLD),
                        "DUAL_CUSTODY_REQUIRED");
            }
            String currentActor = currentActorProvider.getCurrentActor();
            if (movement.getAuthorizedBy().equalsIgnoreCase(currentActor)) {
                throw new BusinessException(
                        "Dual custody violation: authorizer and initiator must be different persons",
                        "DUAL_CUSTODY_SAME_PERSON");
            }
        }

        movement.setMovementRef("CMV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        movement.setStatus("SCHEDULED");

        // Balance check and debit from source vault
        if (StringUtils.hasText(movement.getFromVaultCode())) {
            CashVault from = getVaultByCode(movement.getFromVaultCode());
            if (!"ACTIVE".equals(from.getStatus())) {
                throw new BusinessException("Source vault is not active: " + from.getStatus(), "VAULT_NOT_ACTIVE");
            }
            BigDecimal balanceAfter = from.getTotalBalance().subtract(movement.getAmount());
            if (balanceAfter.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessException(
                        String.format("Insufficient vault balance: available=%s, requested=%s",
                                from.getTotalBalance(), movement.getAmount()),
                        "INSUFFICIENT_VAULT_BALANCE");
            }
            from.setTotalBalance(balanceAfter);
            updateDenominationBreakdown(from, movement.getDenominationDetail(), false);
            vaultRepository.save(from);
        }

        // Credit to destination vault
        if (StringUtils.hasText(movement.getToVaultCode())) {
            CashVault to = getVaultByCode(movement.getToVaultCode());
            if (!"ACTIVE".equals(to.getStatus())) {
                throw new BusinessException("Destination vault is not active: " + to.getStatus(), "VAULT_NOT_ACTIVE");
            }
            to.setTotalBalance(to.getTotalBalance().add(movement.getAmount()));
            updateDenominationBreakdown(to, movement.getDenominationDetail(), true);
            vaultRepository.save(to);
        }

        CashMovement saved = movementRepository.save(movement);
        log.info("Cash movement recorded: ref={}, from={}, to={}, amount={}, type={}, actor={}",
                saved.getMovementRef(), saved.getFromVaultCode(), saved.getToVaultCode(),
                saved.getAmount(), saved.getMovementType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Delivery Confirmation ───────────────────────────────────────────────

    @Transactional
    public CashMovement confirmDelivery(String movementRef, BigDecimal physicalCount) {
        CashMovement m = movementRepository.findByMovementRef(movementRef)
                .orElseThrow(() -> new ResourceNotFoundException("CashMovement", "movementRef", movementRef));

        if ("CONFIRMED".equals(m.getStatus())) {
            throw new BusinessException("Movement is already confirmed", "ALREADY_CONFIRMED");
        }
        if (!"SCHEDULED".equals(m.getStatus()) && !"IN_TRANSIT".equals(m.getStatus())) {
            throw new BusinessException(
                    "Only SCHEDULED or IN_TRANSIT movements can be confirmed; current status: " + m.getStatus(),
                    "INVALID_MOVEMENT_STATUS");
        }
        if (!StringUtils.hasText(m.getReceivedBy())) {
            m.setReceivedBy(currentActorProvider.getCurrentActor());
        }

        // Physical count verification
        if (physicalCount != null) {
            BigDecimal discrepancy = physicalCount.subtract(m.getAmount());
            if (discrepancy.abs().compareTo(BigDecimal.ZERO) > 0) {
                log.warn("Delivery discrepancy detected: ref={}, expected={}, physical={}, discrepancy={}",
                        movementRef, m.getAmount(), physicalCount, discrepancy);

                // If discrepancy exceeds 0.1% of amount, flag for investigation
                BigDecimal threshold = m.getAmount().multiply(new BigDecimal("0.001"));
                if (discrepancy.abs().compareTo(threshold) > 0) {
                    m.setStatus("DISCREPANCY");
                    m.setActualDate(LocalDate.now());
                    CashMovement saved = movementRepository.save(m);
                    log.warn("Movement flagged as DISCREPANCY: ref={}, discrepancy={}, actor={}",
                            movementRef, discrepancy, currentActorProvider.getCurrentActor());
                    return saved;
                }

                // Minor discrepancy: adjust destination vault balance
                if (StringUtils.hasText(m.getToVaultCode())) {
                    CashVault to = getVaultByCode(m.getToVaultCode());
                    to.setTotalBalance(to.getTotalBalance().add(discrepancy));
                    vaultRepository.save(to);
                }
            }
        }

        m.setStatus("CONFIRMED");
        m.setActualDate(LocalDate.now());
        CashMovement saved = movementRepository.save(m);
        log.info("Delivery confirmed: ref={}, actor={}", movementRef, currentActorProvider.getCurrentActor());
        return saved;
    }

    /** Backward-compatible overload without physical count. */
    @Transactional
    public CashMovement confirmDelivery(String movementRef) {
        return confirmDelivery(movementRef, null);
    }

    // ── Vault Reconciliation ────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> reconcileVault(String vaultCode, BigDecimal physicalCount) {
        CashVault v = getVaultByCode(vaultCode);
        BigDecimal systemBalance = v.getTotalBalance();
        BigDecimal discrepancy = physicalCount.subtract(systemBalance);
        boolean balanced = discrepancy.compareTo(BigDecimal.ZERO) == 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vaultCode", vaultCode);
        result.put("systemBalance", systemBalance);
        result.put("physicalCount", physicalCount);
        result.put("discrepancy", discrepancy);
        result.put("balanced", balanced);
        result.put("reconciledAt", Instant.now().toString());
        result.put("reconciledBy", currentActorProvider.getCurrentActor());

        v.setLastReconciledAt(Instant.now());
        v.setLastCountedAt(Instant.now());

        if (!balanced) {
            log.warn("Vault reconciliation discrepancy: vault={}, system={}, physical={}, diff={}",
                    vaultCode, systemBalance, physicalCount, discrepancy);
            result.put("status", "DISCREPANCY");
            // Record the discrepancy but do not auto-adjust; requires management approval
        } else {
            result.put("status", "BALANCED");
            log.info("Vault reconciliation balanced: vault={}, balance={}", vaultCode, systemBalance);
        }

        vaultRepository.save(v);
        return result;
    }

    /** Backward-compatible overload: marks vault as reconciled without physical count comparison. */
    @Transactional
    public CashVault reconcileVault(String vaultCode) {
        CashVault v = getVaultByCode(vaultCode);
        v.setLastReconciledAt(Instant.now());
        log.info("Vault marked as reconciled (no physical count): vault={}, actor={}",
                vaultCode, currentActorProvider.getCurrentActor());
        return vaultRepository.save(v);
    }

    // ── Denomination Tracking ───────────────────────────────────────────────

    @Transactional
    public CashVault updateDenominationBreakdown(String vaultCode, Map<String, Object> denominationBreakdown) {
        CashVault vault = getVaultByCode(vaultCode);
        vault.setDenominationBreakdown(denominationBreakdown);

        // Recalculate total from denomination breakdown
        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<String, Object> entry : denominationBreakdown.entrySet()) {
            try {
                BigDecimal denomination = new BigDecimal(entry.getKey());
                int count = ((Number) entry.getValue()).intValue();
                total = total.add(denomination.multiply(BigDecimal.valueOf(count)));
            } catch (NumberFormatException | ClassCastException e) {
                log.warn("Skipping non-numeric denomination entry: {}={}", entry.getKey(), entry.getValue());
            }
        }
        vault.setTotalBalance(total);
        vault.setLastCountedAt(Instant.now());

        CashVault saved = vaultRepository.save(vault);
        log.info("Denomination breakdown updated: vault={}, total={}, actor={}",
                vaultCode, total, currentActorProvider.getCurrentActor());
        return saved;
    }

    // ── Queries ─────────────────────────────────────────────────────────────

    public List<CashVault> getVaultsByType(String type) {
        return vaultRepository.findByVaultTypeAndStatusOrderByVaultNameAsc(type, "ACTIVE");
    }

    public List<CashMovement> getMovements(String vaultCode) {
        return movementRepository.findByFromVaultCodeOrToVaultCodeOrderByScheduledDateDesc(vaultCode, vaultCode);
    }

    public List<CashMovement> getAllMovements() {
        return movementRepository.findAll();
    }

    public CashVault getVaultByCode(String code) {
        return vaultRepository.findByVaultCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CashVault", "vaultCode", code));
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void updateDenominationBreakdown(CashVault vault, Map<String, Object> movementDenoms, boolean add) {
        if (movementDenoms == null || movementDenoms.isEmpty()) {
            return;
        }
        Map<String, Object> breakdown = vault.getDenominationBreakdown();
        if (breakdown == null) {
            breakdown = new LinkedHashMap<>();
        }
        // Make mutable copy if needed
        breakdown = new LinkedHashMap<>(breakdown);

        for (Map.Entry<String, Object> entry : movementDenoms.entrySet()) {
            String denom = entry.getKey();
            int count;
            try {
                count = ((Number) entry.getValue()).intValue();
            } catch (ClassCastException e) {
                continue;
            }
            int existing = 0;
            if (breakdown.containsKey(denom)) {
                try {
                    existing = ((Number) breakdown.get(denom)).intValue();
                } catch (ClassCastException e) {
                    // ignore
                }
            }
            int newCount = add ? existing + count : existing - count;
            if (newCount < 0) newCount = 0;
            breakdown.put(denom, newCount);
        }
        vault.setDenominationBreakdown(breakdown);
    }
}
