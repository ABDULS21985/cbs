package com.cbs.cashpool.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
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
        if (!pool.getIsActive()) throw new BusinessException("Pool is not active: " + poolCode);

        List<CashPoolParticipant> participants = participantRepository
                .findByPoolIdAndIsActiveTrueOrderByPriorityAsc(pool.getId());
        List<CashPoolSweepLog> logs = new ArrayList<>();

        for (CashPoolParticipant p : participants) {
            if ("HEADER".equals(p.getParticipantRole())) continue;

            BigDecimal sweepAmount = BigDecimal.ZERO;
            String direction;

            // Fetch real account balance for this participant
            BigDecimal currentBalance = accountRepository.findById(p.getAccountId())
                    .map(Account::getAvailableBalance)
                    .orElse(BigDecimal.ZERO);

            switch (pool.getPoolType()) {
                case "ZERO_BALANCE" -> {
                    // Sweep entire balance to header
                    sweepAmount = currentBalance;
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
                case "TARGET_BALANCE" -> {
                    BigDecimal target = p.getTargetBalance();
                    sweepAmount = currentBalance.subtract(target);
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
                default -> {
                    sweepAmount = currentBalance.subtract(p.getTargetBalance());
                    direction = sweepAmount.signum() >= 0 ? "CONCENTRATE" : "DISTRIBUTE";
                }
            }

            if (sweepAmount.abs().compareTo(pool.getMinSweepAmount()) < 0) continue;

            CashPoolSweepLog sweepLog = CashPoolSweepLog.builder()
                    .poolId(pool.getId()).participantId(p.getId())
                    .sweepDirection(direction).amount(sweepAmount.abs())
                    .fromAccountId("CONCENTRATE".equals(direction) ? p.getAccountId() : pool.getHeaderAccountId())
                    .toAccountId("CONCENTRATE".equals(direction) ? pool.getHeaderAccountId() : p.getAccountId())
                    .sweepType(pool.getPoolType())
                    .isIntercompanyLoan(pool.getIntercompanyLoan())
                    .valueDate(LocalDate.now()).status("COMPLETED").build();

            logs.add(sweepLogRepository.save(sweepLog));
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

    private CashPoolStructure getPool(String code) {
        return poolRepository.findByPoolCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("CashPoolStructure", "poolCode", code));
    }
}
