package com.cbs.centralcash.service;
import com.cbs.centralcash.entity.CentralCashPosition;
import com.cbs.centralcash.repository.CentralCashPositionRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class CentralCashService {
    private final CentralCashPositionRepository positionRepository;
    @Transactional
    public CentralCashPosition calculatePosition(LocalDate date, String currency, BigDecimal openingBalance, BigDecimal reserveRequirement) {
        CentralCashPosition pos = positionRepository.findByPositionDateAndCurrency(date, currency).orElse(
                CentralCashPosition.builder().positionDate(date).currency(currency).openingBalance(openingBalance).build());
        BigDecimal totalIn = pos.getClearingInflows().add(pos.getCustomerDeposits()).add(pos.getInterbankInflows()).add(pos.getCbBorrowing());
        BigDecimal totalOut = pos.getClearingOutflows().add(pos.getCustomerWithdrawals()).add(pos.getInterbankOutflows()).add(pos.getCbRepayment());
        pos.setNetMovement(totalIn.subtract(totalOut));
        pos.setClosingBalance(pos.getOpeningBalance().add(pos.getNetMovement()));
        pos.setReserveRequirement(reserveRequirement);
        pos.setExcessReserve(pos.getClosingBalance().subtract(reserveRequirement));
        pos.setStatus("ACTUAL");
        log.info("Central cash position: date={}, currency={}, closing={}, excess={}", date, currency, pos.getClosingBalance(), pos.getExcessReserve());
        return positionRepository.save(pos);
    }
    public List<CentralCashPosition> getHistory(String currency) { return positionRepository.findByCurrencyOrderByPositionDateDesc(currency); }
}
