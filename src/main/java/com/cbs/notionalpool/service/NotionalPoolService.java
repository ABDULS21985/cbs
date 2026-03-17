package com.cbs.notionalpool.service;

import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.notionalpool.entity.*;
import com.cbs.notionalpool.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class NotionalPoolService {

    private final NotionalPoolRepository poolRepository;
    private final NotionalPoolMemberRepository memberRepository;

    @Transactional
    public NotionalPool createPool(NotionalPool pool) {
        pool.setPoolCode("NTL-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        NotionalPool saved = poolRepository.save(pool);
        log.info("Notional pool created: code={}, type={}, method={}", saved.getPoolCode(), saved.getPoolType(), saved.getInterestCalcMethod());
        return saved;
    }

    @Transactional
    public NotionalPoolMember addMember(String poolCode, NotionalPoolMember member) {
        NotionalPool pool = getPool(poolCode);
        member.setPoolId(pool.getId());
        if (member.getBalanceInBase() == null && member.getCurrentBalance() != null) {
            member.setBalanceInBase(member.getCurrentBalance().multiply(member.getFxRateToBase()));
        }
        return memberRepository.save(member);
    }

    @Transactional
    public Map<String, Object> calculateInterestBenefit(String poolCode) {
        NotionalPool pool = getPool(poolCode);
        List<NotionalPoolMember> members = memberRepository.findByPoolIdAndIsActiveTrueOrderByMemberNameAsc(pool.getId());

        BigDecimal totalCredit = BigDecimal.ZERO;
        BigDecimal totalDebit = BigDecimal.ZERO;

        for (NotionalPoolMember m : members) {
            BigDecimal bal = m.getBalanceInBase() != null ? m.getBalanceInBase() : BigDecimal.ZERO;
            if (bal.signum() >= 0) totalCredit = totalCredit.add(bal);
            else totalDebit = totalDebit.add(bal.abs());
        }

        BigDecimal netBalance = totalCredit.subtract(totalDebit);

        // Calculate interest benefit: difference between pooled rate and individual rates
        BigDecimal pooledInterest;
        BigDecimal individualInterest;
        BigDecimal creditRate = pool.getCreditRate() != null ? pool.getCreditRate() : new BigDecimal("2.0");
        BigDecimal debitRate = pool.getDebitRate() != null ? pool.getDebitRate() : new BigDecimal("8.0");
        BigDecimal advantageSpread = pool.getAdvantageSpread() != null ? pool.getAdvantageSpread() : new BigDecimal("0.5");

        // Individual: each balance attracts its own rate
        individualInterest = totalCredit.multiply(creditRate).divide(new BigDecimal("36500"), 4, RoundingMode.HALF_UP)
                .subtract(totalDebit.multiply(debitRate).divide(new BigDecimal("36500"), 4, RoundingMode.HALF_UP));

        // Pooled: net balance attracts advantaged rate
        if (netBalance.signum() >= 0) {
            pooledInterest = netBalance.multiply(creditRate.add(advantageSpread)).divide(new BigDecimal("36500"), 4, RoundingMode.HALF_UP);
        } else {
            pooledInterest = netBalance.abs().multiply(debitRate.subtract(advantageSpread)).divide(new BigDecimal("36500"), 4, RoundingMode.HALF_UP).negate();
        }

        BigDecimal benefit = pooledInterest.subtract(individualInterest).abs();

        pool.setNetPoolBalance(netBalance);
        pool.setTotalCreditBalances(totalCredit);
        pool.setTotalDebitBalances(totalDebit);
        pool.setInterestBenefitMtd(pool.getInterestBenefitMtd().add(benefit));
        pool.setLastCalcDate(LocalDate.now());
        pool.setUpdatedAt(Instant.now());
        poolRepository.save(pool);

        log.info("Notional pool calc: pool={}, net={}, benefit={}/day", poolCode, netBalance, benefit);
        return Map.of("pool_code", poolCode, "net_balance", netBalance, "total_credit", totalCredit,
                "total_debit", totalDebit, "daily_interest_benefit", benefit, "members", members.size());
    }

    public List<NotionalPoolMember> getMembers(String poolCode) {
        NotionalPool pool = getPool(poolCode);
        return memberRepository.findByPoolIdAndIsActiveTrueOrderByMemberNameAsc(pool.getId());
    }

    private NotionalPool getPool(String code) {
        return poolRepository.findByPoolCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("NotionalPool", "poolCode", code));
    }
}
