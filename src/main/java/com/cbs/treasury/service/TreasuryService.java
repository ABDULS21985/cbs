package com.cbs.treasury.service;

import com.cbs.account.entity.Account;
import com.cbs.account.repository.AccountRepository;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.nostro.entity.CorrespondentBank;
import com.cbs.nostro.repository.CorrespondentBankRepository;
import com.cbs.treasury.entity.*;
import com.cbs.treasury.repository.TreasuryDealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TreasuryService {

    private final TreasuryDealRepository dealRepository;
    private final AccountRepository accountRepository;
    private final CorrespondentBankRepository bankRepository;

    @Transactional
    public TreasuryDeal bookDeal(DealType dealType, Long counterpartyId, String leg1Currency,
                                   BigDecimal leg1Amount, Long leg1AccountId, LocalDate leg1ValueDate,
                                   String leg2Currency, BigDecimal leg2Amount, Long leg2AccountId,
                                   LocalDate leg2ValueDate, BigDecimal dealRate, BigDecimal yieldRate,
                                   Integer tenorDays, String dealer) {
        Long seq = dealRepository.getNextDealSequence();
        String dealNumber = String.format("TD%013d", seq);

        TreasuryDeal deal = TreasuryDeal.builder()
                .dealNumber(dealNumber).dealType(dealType)
                .leg1Currency(leg1Currency).leg1Amount(leg1Amount).leg1ValueDate(leg1ValueDate)
                .leg2Currency(leg2Currency).leg2Amount(leg2Amount).leg2ValueDate(leg2ValueDate)
                .dealRate(dealRate).yieldRate(yieldRate).tenorDays(tenorDays)
                .dealer(dealer).status(DealStatus.PENDING).build();

        if (counterpartyId != null) {
            CorrespondentBank cp = bankRepository.findById(counterpartyId)
                    .orElseThrow(() -> new ResourceNotFoundException("CorrespondentBank", "id", counterpartyId));
            deal.setCounterparty(cp);
            deal.setCounterpartyName(cp.getBankName());
        }
        if (leg1AccountId != null) deal.setLeg1Account(accountRepository.findById(leg1AccountId).orElse(null));
        if (leg2AccountId != null) deal.setLeg2Account(accountRepository.findById(leg2AccountId).orElse(null));

        if (tenorDays != null) deal.setMaturityDate(leg1ValueDate.plusDays(tenorDays));
        else if (leg2ValueDate != null) deal.setMaturityDate(leg2ValueDate);

        TreasuryDeal saved = dealRepository.save(deal);
        log.info("Treasury deal booked: number={}, type={}, amount={} {}, rate={}", dealNumber, dealType, leg1Amount, leg1Currency, dealRate);
        return saved;
    }

    @Transactional
    public TreasuryDeal confirmDeal(Long dealId, String confirmedBy) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        if (deal.getStatus() != DealStatus.PENDING) throw new BusinessException("Deal is not pending", "DEAL_NOT_PENDING");
        deal.setStatus(DealStatus.CONFIRMED);
        deal.setConfirmedBy(confirmedBy);
        deal.setConfirmedAt(Instant.now());
        log.info("Deal {} confirmed by {}", deal.getDealNumber(), confirmedBy);
        return dealRepository.save(deal);
    }

    @Transactional
    public TreasuryDeal settleDeal(Long dealId, String settledBy) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        if (deal.getStatus() != DealStatus.CONFIRMED) throw new BusinessException("Deal must be confirmed first", "DEAL_NOT_CONFIRMED");

        // Settle leg 1
        if (deal.getLeg1Account() != null) {
            if (deal.getDealType().name().contains("PLACEMENT") || deal.getDealType().name().contains("PURCHASE")) {
                deal.getLeg1Account().debit(deal.getLeg1Amount());
            } else {
                deal.getLeg1Account().credit(deal.getLeg1Amount());
            }
            accountRepository.save(deal.getLeg1Account());
        }

        // Settle leg 2 if present
        if (deal.getLeg2Account() != null && deal.getLeg2Amount() != null) {
            if (deal.getDealType().name().contains("PLACEMENT") || deal.getDealType().name().contains("PURCHASE")) {
                deal.getLeg2Account().credit(deal.getLeg2Amount());
            } else {
                deal.getLeg2Account().debit(deal.getLeg2Amount());
            }
            accountRepository.save(deal.getLeg2Account());
        }

        // Calculate P&L for FX deals
        if (deal.getDealType() == DealType.FX_SPOT || deal.getDealType() == DealType.FX_FORWARD) {
            if (deal.getLeg1Amount() != null && deal.getLeg2Amount() != null && deal.getDealRate() != null) {
                deal.setRealizedPnl(deal.getLeg2Amount().subtract(
                        deal.getLeg1Amount().multiply(deal.getDealRate())).setScale(2, RoundingMode.HALF_UP));
            }
        }

        deal.setStatus(DealStatus.SETTLED);
        deal.setSettledBy(settledBy);
        deal.setSettledAt(Instant.now());
        log.info("Deal {} settled by {}", deal.getDealNumber(), settledBy);
        return dealRepository.save(deal);
    }

    @Transactional
    public int processMaturedDeals() {
        List<TreasuryDeal> matured = dealRepository.findMaturedDeals(LocalDate.now());
        int count = 0;
        for (TreasuryDeal deal : matured) {
            deal.setStatus(DealStatus.MATURED);
            dealRepository.save(deal);
            count++;
        }
        log.info("Matured {} treasury deals", count);
        return count;
    }

    public TreasuryDeal getDeal(Long id) { return findDealOrThrow(id); }

    public Page<TreasuryDeal> getDealsByStatus(DealStatus status, Pageable pageable) {
        return dealRepository.findByStatus(status, pageable);
    }

    private TreasuryDeal findDealOrThrow(Long id) {
        return dealRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("TreasuryDeal", "id", id));
    }

    public Page<TreasuryDeal> getAllDeals(org.springframework.data.domain.Pageable pageable) {
        return dealRepository.findAll(pageable);
    }

    public Page<TreasuryDeal> getDealsByTypeAndStatus(DealType dealType, DealStatus status, Pageable pageable) {
        return dealRepository.findByDealTypeAndStatus(dealType, status, pageable);
    }

}
