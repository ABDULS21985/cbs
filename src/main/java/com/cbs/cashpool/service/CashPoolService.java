package com.cbs.cashpool.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.cashpool.entity.*;
import com.cbs.cashpool.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CashPoolService {

    private final CashPoolStructureRepository poolRepository;
    private final CashPoolParticipantRepository participantRepository;
    private final CashPoolSweepLogRepository sweepLogRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    @Transactional
    public CashPoolStructure createPool(CashPoolStructure pool) {
        pool.setPoolCode("CPL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        CashPoolStructure saved = poolRepository.save(pool);
        log.info("Cash pool created: code={}, type={}, header={}", saved.getPoolCode(), saved.getPoolType(), saved.getHeaderAccountId());
        return saved;
    }

    @Transactional
    public CashPoolParticipant addParticipant(String poolCode, CashPoolParticipant participant) {
        CashPoolStructure pool = getPool(poolCode);
        participant.setPoolId(pool.getId());
        CashPoolParticipant saved = participantRepository.save(participant);
        log.info("Pool participant added: pool={}, account={}, role={}", poolCode, saved.getAccountId(), saved.getParticipantRole());
        return saved;
    }

    @Transactional
    public List<CashPoolSweepLog> executeSweep(String poolCode) {
        CashPoolStructure pool = getPool(poolCode);
        if (!pool.getIsActive()) throw new BusinessException("Pool is not active: " + poolCode, "POOL_NOT_ACTIVE");

        Account headerAccount = accountRepository.findById(pool.getHeaderAccountId())
                .orElseThrow(() -> new BusinessException(
                        "Header account not found: " + pool.getHeaderAccountId(), "HEADER_ACCOUNT_NOT_FOUND"));

        List<CashPoolParticipant> participants = participantRepository
                .findByPoolIdAndIsActiveTrueOrderByPriorityAsc(pool.getId());
        List<CashPoolSweepLog> logs = new ArrayList<>();

        for (CashPoolParticipant p : participants) {
            if ("HEADER".equals(p.getParticipantRole())) continue;

            Account participantAccount = accountRepository.findById(p.getAccountId())
                    .orElse(null);
            if (participantAccount == null) {
                log.warn("Participant account not found: poolCode={}, accountId={}, skipping", poolCode, p.getAccountId());
                continue;
            }

            BigDecimal sweepAmount = BigDecimal.ZERO;
            String direction;
            BigDecimal currentBalance = participantAccount.getAvailableBalance();
            BigDecimal balanceBefore = currentBalance;

            switch (pool.getPoolType()) {
                case "ZERO_BALANCE" -> {
                    // Sweep entire balance to header
                    sweepAmount = currentBalance;
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
                case "TARGET_BALANCE" -> {
                    BigDecimal target = p.getTargetBalance() != null ? p.getTargetBalance() : BigDecimal.ZERO;
                    sweepAmount = currentBalance.subtract(target);
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
                default -> {
                    BigDecimal target = p.getTargetBalance() != null ? p.getTargetBalance() : BigDecimal.ZERO;
                    sweepAmount = currentBalance.subtract(target);
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
            }

            BigDecimal absSweepAmount = sweepAmount.abs();
            if (absSweepAmount.compareTo(pool.getMinSweepAmount()) < 0) continue;
            if (absSweepAmount.compareTo(BigDecimal.ZERO) == 0) continue;

            // Determine debit/credit accounts based on direction
            Account debitAccount;
            Account creditAccount;
            String debitNarration;
            String creditNarration;

            if ("CONCENTRATE".equals(direction)) {
                debitAccount = participantAccount;
                creditAccount = headerAccount;
                debitNarration = String.format("Cash pool sweep to header - %s", poolCode);
                creditNarration = String.format("Cash pool sweep from %s - %s",
                        participantAccount.getAccountNumber(), poolCode);
            } else {
                debitAccount = headerAccount;
                creditAccount = participantAccount;
                debitNarration = String.format("Cash pool distribution to %s - %s",
                        participantAccount.getAccountNumber(), poolCode);
                creditNarration = String.format("Cash pool distribution from header - %s", poolCode);
            }

            // Execute the actual fund transfer via AccountPostingService
            String externalRef = String.format("SWEEP-%s-%s-%s",
                    poolCode, p.getId(), LocalDate.now().toString().replace("-", ""));
            try {
                accountPostingService.postTransfer(
                        debitAccount, creditAccount,
                        absSweepAmount, absSweepAmount,
                        debitNarration, creditNarration,
                        TransactionChannel.SYSTEM, externalRef,
                        "CASH_POOL", poolCode
                );
            } catch (Exception e) {
                log.error("Sweep transfer failed: pool={}, participant={}, amount={}, error={}",
                        poolCode, p.getId(), absSweepAmount, e.getMessage());
                CashPoolSweepLog failedLog = CashPoolSweepLog.builder()
                        .poolId(pool.getId()).participantId(p.getId())
                        .sweepDirection(direction).amount(absSweepAmount)
                        .fromAccountId("CONCENTRATE".equals(direction) ? p.getAccountId() : pool.getHeaderAccountId())
                        .toAccountId("CONCENTRATE".equals(direction) ? pool.getHeaderAccountId() : p.getAccountId())
                        .balanceBefore(balanceBefore)
                        .sweepType(pool.getPoolType())
                        .isIntercompanyLoan(pool.getIntercompanyLoan())
                        .valueDate(LocalDate.now()).status("FAILED").build();
                logs.add(sweepLogRepository.save(failedLog));
                continue;
            }

            // Re-read the participant account balance after posting
            BigDecimal balanceAfter = accountRepository.findById(p.getAccountId())
                    .map(Account::getAvailableBalance)
                    .orElse(BigDecimal.ZERO);

            CashPoolSweepLog sweepLog = CashPoolSweepLog.builder()
                    .poolId(pool.getId()).participantId(p.getId())
                    .sweepDirection(direction).amount(absSweepAmount)
                    .fromAccountId("CONCENTRATE".equals(direction) ? p.getAccountId() : pool.getHeaderAccountId())
                    .toAccountId("CONCENTRATE".equals(direction) ? pool.getHeaderAccountId() : p.getAccountId())
                    .balanceBefore(balanceBefore).balanceAfter(balanceAfter)
                    .sweepType(pool.getPoolType())
                    .isIntercompanyLoan(pool.getIntercompanyLoan())
                    .valueDate(LocalDate.now()).status("COMPLETED").build();

            logs.add(sweepLogRepository.save(sweepLog));
            log.info("Sweep completed: pool={}, participant={}, direction={}, amount={}, balanceBefore={}, balanceAfter={}",
                    poolCode, p.getId(), direction, absSweepAmount, balanceBefore, balanceAfter);
        }

        log.info("Cash pool sweep executed: pool={}, transactions={}", poolCode, logs.size());
        return logs;
    }

    public List<CashPoolParticipant> getParticipants(String poolCode) {
        CashPoolStructure pool = getPool(poolCode);
        return participantRepository.findByPoolIdAndIsActiveTrueOrderByPriorityAsc(pool.getId());
    }

    public List<CashPoolSweepLog> getSweepHistory(String poolCode, LocalDate date) {
        CashPoolStructure pool = getPool(poolCode);
        return date != null
                ? sweepLogRepository.findByPoolIdAndValueDateOrderByCreatedAtDesc(pool.getId(), date)
                : sweepLogRepository.findByPoolIdOrderByCreatedAtDesc(pool.getId());
    }

    public List<CashPoolStructure> getByCustomer(Long customerId) {
        return poolRepository.findByCustomerIdAndIsActiveTrueOrderByPoolNameAsc(customerId);
    }

    public List<CashPoolStructure> getAllPools() {
        return poolRepository.findByIsActiveTrueOrderByPoolNameAsc();
    }

    public CashPoolStructure getPoolByCode(String poolCode) {
        return getPool(poolCode);
    }

    @Transactional
    public CashPoolParticipant updateParticipant(String poolCode, Long participantId, CashPoolParticipant updates) {
        CashPoolStructure pool = getPool(poolCode);
        CashPoolParticipant existing = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("CashPoolParticipant", "id", participantId));
        if (!existing.getPoolId().equals(pool.getId())) {
            throw new BusinessException("Participant does not belong to pool: " + poolCode);
        }
        if (updates.getSweepDirection() != null) existing.setSweepDirection(updates.getSweepDirection());
        if (updates.getTargetBalance() != null) existing.setTargetBalance(updates.getTargetBalance());
        if (updates.getPriority() != null) existing.setPriority(updates.getPriority());
        if (updates.getParticipantName() != null) existing.setParticipantName(updates.getParticipantName());
        if (updates.getParticipantRole() != null) existing.setParticipantRole(updates.getParticipantRole());
        CashPoolParticipant saved = participantRepository.save(existing);
        log.info("Pool participant updated: pool={}, participantId={}", poolCode, participantId);
        return saved;
    }

    @Transactional
    public void removeParticipant(String poolCode, Long participantId) {
        CashPoolStructure pool = getPool(poolCode);
        CashPoolParticipant existing = participantRepository.findById(participantId)
                .orElseThrow(() -> new ResourceNotFoundException("CashPoolParticipant", "id", participantId));
        if (!existing.getPoolId().equals(pool.getId())) {
            throw new BusinessException("Participant does not belong to pool: " + poolCode);
        }
        existing.setIsActive(false);
        participantRepository.save(existing);
        log.info("Pool participant removed: pool={}, participantId={}", poolCode, participantId);
    }

    private CashPoolStructure getPool(String code) {
        return poolRepository.findByPoolCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CashPoolStructure", "poolCode", code));
    }
}
