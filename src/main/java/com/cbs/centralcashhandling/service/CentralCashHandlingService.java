package com.cbs.centralcashhandling.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.centralcashhandling.entity.*; import com.cbs.centralcashhandling.repository.*;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.time.LocalDate; import java.util.List; import java.util.UUID;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CentralCashHandlingService {
    private final CashVaultRepository vaultRepository;
    private final CashMovementRepository movementRepository;
    @Transactional public CashVault registerVault(CashVault vault) { vault.setVaultCode("VLT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase()); return vaultRepository.save(vault); }
    @Transactional public CashMovement recordMovement(CashMovement movement) {
        movement.setMovementRef("CMV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        if (movement.getFromVaultCode() != null) { CashVault from = getVaultByCode(movement.getFromVaultCode()); from.setTotalBalance(from.getTotalBalance().subtract(movement.getAmount())); vaultRepository.save(from); }
        if (movement.getToVaultCode() != null) { CashVault to = getVaultByCode(movement.getToVaultCode()); to.setTotalBalance(to.getTotalBalance().add(movement.getAmount())); vaultRepository.save(to); }
        return movementRepository.save(movement);
    }
    @Transactional public CashMovement confirmDelivery(String movementRef) {
        CashMovement m = movementRepository.findByMovementRef(movementRef).orElseThrow(() -> new ResourceNotFoundException("CashMovement", "movementRef", movementRef));
        m.setStatus("CONFIRMED"); m.setActualDate(LocalDate.now()); return movementRepository.save(m);
    }
    @Transactional public CashVault reconcileVault(String vaultCode) { CashVault v = getVaultByCode(vaultCode); v.setLastReconciledAt(Instant.now()); return vaultRepository.save(v); }
    public List<CashVault> getVaultsByType(String type) { return vaultRepository.findByVaultTypeAndStatusOrderByVaultNameAsc(type, "ACTIVE"); }
    public List<CashMovement> getMovements(String vaultCode) { return movementRepository.findByFromVaultCodeOrToVaultCodeOrderByScheduledDateDesc(vaultCode, vaultCode); }
    public List<CashMovement> getAllMovements() { return movementRepository.findAll(); }
    public CashVault getVaultByCode(String code) { return vaultRepository.findByVaultCode(code).orElseThrow(() -> new ResourceNotFoundException("CashVault", "vaultCode", code)); }
}
