package com.cbs.loyalty.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.loyalty.entity.*;
import com.cbs.loyalty.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
        String membershipNumber = "LYL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        LoyaltyAccount account = LoyaltyAccount.builder()
                .customerId(customerId).programId(program.getId()).membershipNumber(membershipNumber).build();
        LoyaltyAccount saved = accountRepository.save(account);
        log.info("Loyalty enrollment: customer={}, program={}, number={}", customerId, programCode, membershipNumber);
        return saved;
    }

    @Transactional
    public LoyaltyAccount earnPoints(String membershipNumber, Long points, String description, Long sourceTransactionId) {
        LoyaltyAccount account = getAccount(membershipNumber);
        if (!"ACTIVE".equals(account.getStatus())) throw new BusinessException("Loyalty account not active");

        account.setPointsBalance(account.getPointsBalance() + points);
        account.setPointsEarnedYtd(account.getPointsEarnedYtd() + points);
        account.setLifetimePoints(account.getLifetimePoints() + points);

        transactionRepository.save(LoyaltyTransaction.builder()
                .accountId(account.getId()).transactionType("EARN").points(points)
                .description(description).sourceTransactionId(sourceTransactionId).build());

        log.debug("Points earned: account={}, points={}", membershipNumber, points);
        return accountRepository.save(account);
    }

    @Transactional
    public LoyaltyAccount redeemPoints(String membershipNumber, Long points, String redemptionType) {
        LoyaltyAccount account = getAccount(membershipNumber);
        LoyaltyProgram program = programRepository.findById(account.getProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("LoyaltyProgram", "id", account.getProgramId()));

        if (account.getPointsBalance() < points)
            throw new BusinessException("Insufficient points: have=" + account.getPointsBalance() + ", need=" + points);
        if (points < program.getMinRedemptionPoints())
            throw new BusinessException("Minimum redemption: " + program.getMinRedemptionPoints() + " points");

        BigDecimal monetaryValue = program.getPointsValueCurrency().multiply(BigDecimal.valueOf(points));

        account.setPointsBalance(account.getPointsBalance() - points);
        account.setPointsRedeemedYtd(account.getPointsRedeemedYtd() + points);

        transactionRepository.save(LoyaltyTransaction.builder()
                .accountId(account.getId()).transactionType("REDEEM").points(-points)
                .description("Redemption: " + redemptionType).redemptionType(redemptionType)
                .redemptionValue(monetaryValue).build());

        log.info("Points redeemed: account={}, points={}, value={}", membershipNumber, points, monetaryValue);
        return accountRepository.save(account);
    }

    public List<LoyaltyAccount> getCustomerAccounts(Long customerId) {
        return accountRepository.findByCustomerIdAndStatusOrderByEnrolledAtDesc(customerId, "ACTIVE");
    }

    public List<LoyaltyTransaction> getTransactions(String membershipNumber) {
        LoyaltyAccount account = getAccount(membershipNumber);
        return transactionRepository.findByAccountIdOrderByCreatedAtDesc(account.getId());
    }

    private LoyaltyAccount getAccount(String membershipNumber) {
        return accountRepository.findByMembershipNumber(membershipNumber)
                .orElseThrow(() -> new ResourceNotFoundException("LoyaltyAccount", "membershipNumber", membershipNumber));
    }
}
