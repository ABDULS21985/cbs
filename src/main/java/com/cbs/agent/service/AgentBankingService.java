package com.cbs.agent.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.agent.entity.*;
import com.cbs.agent.repository.*;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class AgentBankingService {

    private final BankingAgentRepository agentRepository;
    private final AgentTransactionRepository txnRepository;
    private final AccountRepository accountRepository;
    private final AccountPostingService accountPostingService;

    @Transactional
    public BankingAgent onboardAgent(BankingAgent agent) {
        agentRepository.findByAgentCode(agent.getAgentCode()).ifPresent(existing -> {
            throw new BusinessException("Agent code already exists: " + agent.getAgentCode(), "DUPLICATE_AGENT");
        });
        BankingAgent saved = agentRepository.save(agent);
        log.info("Agent onboarded: code={}, name={}, type={}", agent.getAgentCode(), agent.getAgentName(), agent.getAgentType());
        return saved;
    }

    @Transactional
    public AgentTransaction processTransaction(String agentCode, String transactionType, Long customerId,
                                                  Long accountId, BigDecimal amount, String currencyCode,
                                                  BigDecimal geoLat, BigDecimal geoLon) {
        BankingAgent agent = agentRepository.findByAgentCode(agentCode)
                .orElseThrow(() -> new ResourceNotFoundException("BankingAgent", "agentCode", agentCode));

        if (!"ACTIVE".equals(agent.getStatus())) {
            throw new BusinessException("Agent is not active", "AGENT_NOT_ACTIVE");
        }

        // Validate single transaction limit
        if (agent.getSingleTxnLimit() != null && amount.compareTo(agent.getSingleTxnLimit()) > 0) {
            throw new BusinessException("Exceeds agent single transaction limit", "EXCEEDS_AGENT_LIMIT");
        }

        // Validate daily limit
        if (agent.getDailyTxnLimit() != null) {
            Instant startOfDay = LocalDate.now().atStartOfDay(ZoneOffset.UTC).toInstant();
            BigDecimal dailyVolume = txnRepository.sumDailyVolume(agent.getId(), startOfDay);
            if (dailyVolume.add(amount).compareTo(agent.getDailyTxnLimit()) > 0) {
                throw new BusinessException("Exceeds agent daily limit", "EXCEEDS_DAILY_LIMIT");
            }
        }

        // Float check for cash-out
        if ("CASH_OUT".equals(transactionType)) {
            if (agent.getFloatBalance().compareTo(amount) < 0) {
                throw new BusinessException("Insufficient agent float balance", "INSUFFICIENT_FLOAT");
            }
            agent.setFloatBalance(agent.getFloatBalance().subtract(amount));
        } else if ("CASH_IN".equals(transactionType)) {
            agent.setFloatBalance(agent.getFloatBalance().add(amount));
        }

        // Process underlying account transaction
        if (accountId != null) {
            Account account = accountRepository.findById(accountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
            if ("CASH_IN".equals(transactionType)) {
                accountPostingService.postCredit(
                        account,
                        TransactionType.CREDIT,
                        amount,
                        "Agent cash-in " + agentCode,
                        TransactionChannel.AGENT,
                        agentCode + ":CASH_IN");
            } else if ("CASH_OUT".equals(transactionType)) {
                if (account.getAvailableBalance().compareTo(amount) < 0) {
                    throw new BusinessException("Insufficient customer balance", "INSUFFICIENT_BALANCE");
                }
                accountPostingService.postDebit(
                        account,
                        TransactionType.DEBIT,
                        amount,
                        "Agent cash-out " + agentCode,
                        TransactionChannel.AGENT,
                        agentCode + ":CASH_OUT");
            }
        }

        // Calculate commission
        BigDecimal commission = agent.calculateCommission(amount);

        // Credit commission to agent's commission account
        if (commission.compareTo(BigDecimal.ZERO) > 0 && agent.getCommissionAccountId() != null) {
            accountRepository.findById(agent.getCommissionAccountId()).ifPresent(commAcct -> {
                accountPostingService.postCredit(
                        commAcct,
                        TransactionType.CREDIT,
                        commission,
                        "Agent commission " + agentCode,
                        TransactionChannel.AGENT,
                        agentCode + ":COMMISSION");
            });
        }

        agent.setLastTransactionDate(LocalDate.now());
        agentRepository.save(agent);

        String ref = "AGT-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        AgentTransaction txn = AgentTransaction.builder()
                .agentId(agent.getId()).transactionType(transactionType)
                .customerId(customerId).accountId(accountId)
                .amount(amount).commissionAmount(commission)
                .currencyCode(currencyCode != null ? currencyCode : "USD")
                .reference(ref).status("COMPLETED")
                .geoLatitude(geoLat).geoLongitude(geoLon).build();

        AgentTransaction saved = txnRepository.save(txn);
        log.info("Agent txn: agent={}, type={}, amount={}, commission={}, ref={}", agentCode, transactionType, amount, commission, ref);
        return saved;
    }

    @Transactional
    public BankingAgent topUpFloat(String agentCode, BigDecimal amount) {
        BankingAgent agent = findAgentOrThrow(agentCode);
        agent.setFloatBalance(agent.getFloatBalance().add(amount));
        log.info("Agent float topped up: agent={}, amount={}, new balance={}", agentCode, amount, agent.getFloatBalance());
        return agentRepository.save(agent);
    }

    public BankingAgent getAgent(String agentCode) { return findAgentOrThrow(agentCode); }

    public Page<BankingAgent> getActiveAgents(Pageable pageable) {
        return agentRepository.findByStatusOrderByAgentNameAsc("ACTIVE", pageable);
    }

    public Page<AgentTransaction> getAgentTransactions(Long agentId, Pageable pageable) {
        return txnRepository.findByAgentIdOrderByCreatedAtDesc(agentId, pageable);
    }

    private BankingAgent findAgentOrThrow(String code) {
        return agentRepository.findByAgentCode(code).orElseThrow(() -> new ResourceNotFoundException("BankingAgent", "agentCode", code));
    }
}
