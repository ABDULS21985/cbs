package com.cbs.treasury.service;

import com.cbs.account.entity.Account;
import com.cbs.account.entity.TransactionChannel;
import com.cbs.account.entity.TransactionType;
import com.cbs.account.repository.AccountRepository;
import com.cbs.account.service.AccountPostingService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.config.CbsProperties;
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
import org.springframework.util.StringUtils;

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
    private final AccountPostingService accountPostingService;
    private final CurrentActorProvider currentActorProvider;
    private final CbsProperties cbsProperties;

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
    public TreasuryDeal confirmDeal(Long dealId) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String confirmedBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() != DealStatus.PENDING) throw new BusinessException("Deal is not pending", "DEAL_NOT_PENDING");
        deal.setStatus(DealStatus.CONFIRMED);
        deal.setConfirmedBy(confirmedBy);
        deal.setConfirmedAt(Instant.now());
        log.info("Deal {} confirmed by {}", deal.getDealNumber(), confirmedBy);
        return dealRepository.save(deal);
    }

    @Transactional
    public TreasuryDeal settleDeal(Long dealId) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String settledBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() != DealStatus.CONFIRMED) throw new BusinessException("Deal must be confirmed first", "DEAL_NOT_CONFIRMED");

        boolean outgoingLeg1 = isOutgoingLeg1(deal);
        settleLegs(deal, outgoingLeg1);

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

    @Transactional
    public TreasuryDeal amendDeal(Long dealId, BigDecimal newAmount, BigDecimal newRate,
                                    LocalDate newMaturityDate, String reason) {
        TreasuryDeal deal = findDealOrThrow(dealId);
        String amendedBy = currentActorProvider.getCurrentActor();
        if (deal.getStatus() == DealStatus.SETTLED || deal.getStatus() == DealStatus.MATURED) {
            throw new BusinessException("Cannot amend a settled or matured deal", "DEAL_AMENDMENT_DENIED");
        }

        // Store previous values in metadata for audit trail
        deal.getMetadata().put("lastAmendment", java.util.Map.of(
                "previousAmount", deal.getLeg1Amount(),
                "previousRate", deal.getDealRate(),
                "previousMaturityDate", deal.getMaturityDate() != null ? deal.getMaturityDate().toString() : "",
                "reason", reason != null ? reason : "",
                "amendedBy", amendedBy,
                "amendedAt", Instant.now().toString()
        ));

        // Track amendment count
        int amendCount = deal.getMetadata().containsKey("amendmentCount")
                ? ((Number) deal.getMetadata().get("amendmentCount")).intValue() + 1 : 1;
        deal.getMetadata().put("amendmentCount", amendCount);

        if (newAmount != null) deal.setLeg1Amount(newAmount);
        if (newRate != null) deal.setDealRate(newRate);
        if (newMaturityDate != null) {
            deal.setMaturityDate(newMaturityDate);
            if (deal.getLeg1ValueDate() != null) {
                deal.setTenorDays((int) ChronoUnit.DAYS.between(deal.getLeg1ValueDate(), newMaturityDate));
            }
        }

        TreasuryDeal saved = dealRepository.save(deal);
        log.info("Deal {} amended by {}: reason={}", deal.getDealNumber(), amendedBy, reason);
        return saved;
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

    private void settleLegs(TreasuryDeal deal, boolean outgoingLeg1) {
        Account debitAccount = outgoingLeg1 ? deal.getLeg1Account() : deal.getLeg2Account();
        Account creditAccount = outgoingLeg1 ? deal.getLeg2Account() : deal.getLeg1Account();
        BigDecimal debitAmount = outgoingLeg1 ? deal.getLeg1Amount() : deal.getLeg2Amount();
        BigDecimal creditAmount = outgoingLeg1 ? deal.getLeg2Amount() : deal.getLeg1Amount();

        if (debitAccount != null && creditAccount != null && debitAmount != null && creditAmount != null) {
            BigDecimal debitFxRate = resolveDebitFxRate(debitAmount, creditAmount);
            accountPostingService.postTransfer(
                    debitAccount,
                    creditAccount,
                    debitAmount,
                    creditAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber(),
                    debitFxRate,
                    BigDecimal.ONE,
                    "TREASURY",
                    deal.getDealNumber()
            );
            return;
        }

        if (debitAccount != null && debitAmount != null) {
            accountPostingService.postDebitAgainstGl(
                    debitAccount,
                    TransactionType.DEBIT,
                    debitAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber() + ":DR",
                    resolveTreasurySettlementGlCode(),
                    "TREASURY",
                    deal.getDealNumber()
            );
        }

        if (creditAccount != null && creditAmount != null) {
            accountPostingService.postCreditAgainstGl(
                    creditAccount,
                    TransactionType.CREDIT,
                    creditAmount,
                    "Treasury deal settlement " + deal.getDealNumber(),
                    TransactionChannel.SYSTEM,
                    deal.getDealNumber() + ":CR",
                    resolveTreasurySettlementGlCode(),
                    "TREASURY",
                    deal.getDealNumber()
            );
        }
    }

    private boolean isOutgoingLeg1(TreasuryDeal deal) {
        String dealType = deal.getDealType().name();
        return dealType.contains("PLACEMENT") || dealType.contains("PURCHASE");
    }

    private BigDecimal resolveDebitFxRate(BigDecimal debitAmount, BigDecimal creditAmount) {
        if (debitAmount == null || creditAmount == null || debitAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ONE;
        }
        if (debitAmount.compareTo(creditAmount) == 0) {
            return BigDecimal.ONE;
        }
        return creditAmount.divide(debitAmount, 8, RoundingMode.HALF_UP);
    }

    private String resolveTreasurySettlementGlCode() {
        String glCode = cbsProperties.getLedger().getExternalClearingGlCode();
        if (!StringUtils.hasText(glCode)) {
            throw new BusinessException("CBS_LEDGER_EXTERNAL_CLEARING_GL is required for treasury settlement",
                    "MISSING_TREASURY_SETTLEMENT_GL");
        }
        return glCode;
    }

}
