package com.cbs.centralcash.service;
import com.cbs.centralcash.entity.CentralCashPosition;
import com.cbs.centralcash.repository.CentralCashPositionRepository;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.*;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CentralCashService {
    private final CentralCashPositionRepository positionRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public CentralCashPosition calculatePosition(LocalDate date, String currency, BigDecimal openingBalance, BigDecimal reserveRequirement) {
        if (date == null) {
            throw new BusinessException("Position date is required", "MISSING_DATE");
        }
        if (currency == null || currency.isBlank()) {
            throw new BusinessException("Currency is required", "MISSING_CURRENCY");
        }
        if (openingBalance == null) {
            throw new BusinessException("Opening balance is required", "MISSING_OPENING_BALANCE");
        }
        if (reserveRequirement == null || reserveRequirement.signum() < 0) {
            throw new BusinessException("Reserve requirement must be non-negative", "INVALID_RESERVE_REQUIREMENT");
        }

        CentralCashPosition pos = positionRepository.findByPositionDateAndCurrency(date, currency).orElse(
                CentralCashPosition.builder().positionDate(date).currency(currency).openingBalance(openingBalance).build());

        // Null safety on all flow fields
        BigDecimal clearingInflows = pos.getClearingInflows() != null ? pos.getClearingInflows() : BigDecimal.ZERO;
        BigDecimal customerDeposits = pos.getCustomerDeposits() != null ? pos.getCustomerDeposits() : BigDecimal.ZERO;
        BigDecimal interbankInflows = pos.getInterbankInflows() != null ? pos.getInterbankInflows() : BigDecimal.ZERO;
        BigDecimal cbBorrowing = pos.getCbBorrowing() != null ? pos.getCbBorrowing() : BigDecimal.ZERO;
        BigDecimal clearingOutflows = pos.getClearingOutflows() != null ? pos.getClearingOutflows() : BigDecimal.ZERO;
        BigDecimal customerWithdrawals = pos.getCustomerWithdrawals() != null ? pos.getCustomerWithdrawals() : BigDecimal.ZERO;
        BigDecimal interbankOutflows = pos.getInterbankOutflows() != null ? pos.getInterbankOutflows() : BigDecimal.ZERO;
        BigDecimal cbRepayment = pos.getCbRepayment() != null ? pos.getCbRepayment() : BigDecimal.ZERO;

        BigDecimal totalIn = clearingInflows.add(customerDeposits).add(interbankInflows).add(cbBorrowing);
        BigDecimal totalOut = clearingOutflows.add(customerWithdrawals).add(interbankOutflows).add(cbRepayment);
        pos.setNetMovement(totalIn.subtract(totalOut));
        BigDecimal currentOpening = pos.getOpeningBalance() != null ? pos.getOpeningBalance() : openingBalance;
        pos.setClosingBalance(currentOpening.add(pos.getNetMovement()));
        pos.setReserveRequirement(reserveRequirement);
        pos.setExcessReserve(pos.getClosingBalance().subtract(reserveRequirement));

        // Reserve requirement validation
        if (pos.getExcessReserve().signum() < 0) {
            log.warn("AUDIT: Reserve shortfall detected: date={}, currency={}, shortfall={}",
                    date, currency, pos.getExcessReserve().negate());
        }

        pos.setStatus("ACTUAL");
        CentralCashPosition saved = positionRepository.save(pos);
        log.info("AUDIT: Central cash position: date={}, currency={}, closing={}, excess={}, actor={}",
                date, currency, pos.getClosingBalance(), pos.getExcessReserve(), currentActorProvider.getCurrentActor());
        return saved;
    }

    public List<CentralCashPosition> getHistory(String currency) {
        return positionRepository.findByCurrencyOrderByPositionDateDesc(currency);
    }

    /**
     * Multi-day reconciliation: calculate positions for a date range.
     */
    @Transactional
    public List<CentralCashPosition> reconcileDateRange(String currency, LocalDate from, LocalDate to, BigDecimal reserveRequirement) {
        if (from.isAfter(to)) {
            throw new BusinessException("Start date must not be after end date", "INVALID_DATE_RANGE");
        }
        List<CentralCashPosition> results = new ArrayList<>();
        List<CentralCashPosition> history = positionRepository.findByCurrencyOrderByPositionDateDesc(currency);
        BigDecimal carryForwardBalance = history.stream()
                .filter(p -> p.getPositionDate().isBefore(from))
                .findFirst()
                .map(CentralCashPosition::getClosingBalance)
                .orElse(BigDecimal.ZERO);

        LocalDate current = from;
        while (!current.isAfter(to)) {
            CentralCashPosition pos = calculatePosition(current, currency, carryForwardBalance, reserveRequirement);
            results.add(pos);
            carryForwardBalance = pos.getClosingBalance();
            current = current.plusDays(1);
        }
        log.info("AUDIT: Multi-day reconciliation completed: currency={}, from={}, to={}, days={}, actor={}",
                currency, from, to, results.size(), currentActorProvider.getCurrentActor());
        return results;
    }
}
