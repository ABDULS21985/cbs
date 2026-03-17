package com.cbs.loyalty.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.loyalty.entity.*;
import com.cbs.loyalty.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class LoyaltyService {

    private final LoyaltyProgramRepository programRepository;
    private final LoyaltyAccountRepository accountRepository;
    private final LoyaltyTransactionRepository transactionRepository;

    @Transactional
    public LoyaltyProgram createProgram(LoyaltyProgram program) {
        program.setProgramCode("LPG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        return programRepository.save(program);
    }

    @Transactional
    public LoyaltyAccount enroll(Long customerId, String programCode) {
        LoyaltyProgram program = programRepository.findByProgramCode(programCode)
                .orElseThrow(() -> new ResourceNotFoundException("LoyaltyProgram", "programCode", programCode));
        String loyaltyNumber = "LYL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        LoyaltyAccount account = LoyaltyAccount.builder()
                .customerId(customerId).programId(program.getId()).loyaltyNumber(loyaltyNumber).build();
        LoyaltyAccount saved = accountRepository.save(account);
        log.info("Loyalty enrollment: customer={}, program={}, number={}", customerId, programCode, loyaltyNumber);
        return saved;
    }

    @Transactional
    public LoyaltyAccount earnPoints(String loyaltyNumber, int points, String description, Long sourceTransactionId) {
        LoyaltyAccount account = getAccount(loyaltyNumber);
        if (!"ACTIVE".equals(account.getStatus())) throw new BusinessException("Loyalty account not active");

        account.setCurrentBalance(account.getCurrentBalance() + points);
        account.setLifetimeEarned(account.getLifetimeEarned() + points);

        transactionRepository.save(LoyaltyTransaction.builder()
                .loyaltyAccountId(account.getId()).transactionType("EARN").points(points)
                .description(description).sourceTransactionId(sourceTransactionId).build());

        log.debug("Points earned: account={}, points={}", loyaltyNumber, points);
        return accountRepository.save(account);
    }

    @Transactional
    public LoyaltyAccount redeemPoints(String loyaltyNumber, int points, String description) {
        LoyaltyAccount account = getAccount(loyaltyNumber);
        LoyaltyProgram program = programRepository.findById(account.getProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("LoyaltyProgram", "id", account.getProgramId()));

        if (account.getCurrentBalance() < points)
            throw new BusinessException("Insufficient points: have=" + account.getCurrentBalance() + ", need=" + points);
        if (points < program.getMinRedemptionPoints())
            throw new BusinessException("Minimum redemption: " + program.getMinRedemptionPoints() + " points");

        account.setCurrentBalance(account.getCurrentBalance() - points);
        account.setLifetimeRedeemed(account.getLifetimeRedeemed() + points);

        transactionRepository.save(LoyaltyTransaction.builder()
                .loyaltyAccountId(account.getId()).transactionType("REDEEM").points(-points)
                .description(description).build());

        log.info("Points redeemed: account={}, points={}", loyaltyNumber, points);
        return accountRepository.save(account);
    }

    public List<LoyaltyAccount> getCustomerAccounts(Long customerId) {
        return accountRepository.findByCustomerIdAndStatus(customerId, "ACTIVE");
    }

    public List<LoyaltyTransaction> getTransactions(String loyaltyNumber) {
        LoyaltyAccount account = getAccount(loyaltyNumber);
        return transactionRepository.findByLoyaltyAccountIdOrderByCreatedAtDesc(account.getId());
    }

    private LoyaltyAccount getAccount(String loyaltyNumber) {
        return accountRepository.findByLoyaltyNumber(loyaltyNumber)
                .orElseThrow(() -> new ResourceNotFoundException("LoyaltyAccount", "loyaltyNumber", loyaltyNumber));
    }
}
