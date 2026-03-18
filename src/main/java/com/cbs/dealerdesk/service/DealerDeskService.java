package com.cbs.dealerdesk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.dealerdesk.entity.DealingDesk;
import com.cbs.dealerdesk.entity.DeskDealer;
import com.cbs.dealerdesk.entity.DeskPnl;
import com.cbs.dealerdesk.repository.DealingDeskRepository;
import com.cbs.dealerdesk.repository.DeskDealerRepository;
import com.cbs.dealerdesk.repository.DeskPnlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class DealerDeskService {

    private final DealingDeskRepository deskRepository;
    private final DeskDealerRepository dealerRepository;
    private final DeskPnlRepository pnlRepository;

    @Transactional
    public DealingDesk createDesk(DealingDesk desk) {
        desk.setDeskCode("DSK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        desk.setStatus("ACTIVE");
        DealingDesk saved = deskRepository.save(desk);
        log.info("Dealing desk created: code={}, type={}", saved.getDeskCode(), saved.getDeskType());
        return saved;
    }

    @Transactional
    public DeskDealer authorizeDealer(Long deskId, DeskDealer dealer) {
        DealingDesk desk = findDeskOrThrow(deskId);
        dealer.setDeskId(desk.getId());
        dealer.setStatus("ACTIVE");
        DeskDealer saved = dealerRepository.save(dealer);
        log.info("Dealer {} authorized for desk {}", saved.getEmployeeId(), desk.getDeskCode());
        return saved;
    }

    @Transactional
    public DeskDealer revokeDealer(Long dealerId) {
        DeskDealer dealer = dealerRepository.findById(dealerId)
                .orElseThrow(() -> new ResourceNotFoundException("DeskDealer", "id", dealerId));
        dealer.setStatus("REVOKED");
        log.info("Dealer {} revoked", dealer.getEmployeeId());
        return dealerRepository.save(dealer);
    }

    @Transactional
    public DeskPnl recordDailyPnl(Long deskId, DeskPnl pnl) {
        DealingDesk desk = findDeskOrThrow(deskId);
        pnl.setDeskId(desk.getId());

        BigDecimal realized = pnl.getRealizedPnl() != null ? pnl.getRealizedPnl() : BigDecimal.ZERO;
        BigDecimal unrealized = pnl.getUnrealizedPnl() != null ? pnl.getUnrealizedPnl() : BigDecimal.ZERO;
        pnl.setTotalPnl(realized.add(unrealized));

        if (desk.getDailyVarLimit() != null && desk.getDailyVarLimit().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal negativePortion = pnl.getTotalPnl().min(BigDecimal.ZERO).abs();
            pnl.setVarUtilizationPct(negativePortion.divide(desk.getDailyVarLimit(), 2, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
        }

        pnl.setStopLossBreached(desk.getStopLossLimit() != null
                && unrealized.abs().compareTo(desk.getStopLossLimit()) > 0);

        DeskPnl saved = pnlRepository.save(pnl);
        log.info("PnL recorded for desk {}: total={}, stopLossBreached={}", desk.getDeskCode(), saved.getTotalPnl(), saved.getStopLossBreached());
        return saved;
    }

    public void checkDealerAuthority(Long dealerId, BigDecimal amount, String instrumentType) {
        DeskDealer dealer = dealerRepository.findById(dealerId)
                .orElseThrow(() -> new ResourceNotFoundException("DeskDealer", "id", dealerId));

        if (!"ACTIVE".equals(dealer.getStatus())) {
            throw new BusinessException("Dealer is not active");
        }
        if (dealer.getSingleTradeLimit() != null && amount.compareTo(dealer.getSingleTradeLimit()) > 0) {
            throw new BusinessException("Trade amount exceeds dealer single trade limit");
        }
        if (dealer.getAuthorizedInstruments() != null && !dealer.getAuthorizedInstruments().contains(instrumentType)) {
            throw new BusinessException("Dealer is not authorized for instrument type: " + instrumentType);
        }
    }

    public Map<String, Object> getDeskDashboard(Long deskId) {
        DealingDesk desk = findDeskOrThrow(deskId);
        List<DeskDealer> activeDealers = dealerRepository.findByDeskIdAndStatus(deskId, "ACTIVE");
        DeskPnl latestPnl = pnlRepository.findFirstByDeskIdOrderByPnlDateDesc(deskId).orElse(null);
        return Map.of("desk", desk, "activeDealers", activeDealers, "latestPnl", latestPnl != null ? latestPnl : Map.of());
    }

    public List<DealingDesk> getActiveDesks() {
        return deskRepository.findByStatus("ACTIVE");
    }

    public List<DeskDealer> getDeskDealers(Long deskId) {
        return dealerRepository.findByDeskId(deskId);
    }

    @Transactional
    public DealingDesk suspendDesk(Long deskId) {
        DealingDesk desk = findDeskOrThrow(deskId);
        desk.setStatus("SUSPENDED");
        log.info("Desk {} suspended", desk.getDeskCode());
        return deskRepository.save(desk);
    }

    private DealingDesk findDeskOrThrow(Long deskId) {
        return deskRepository.findById(deskId)
                .orElseThrow(() -> new ResourceNotFoundException("DealingDesk", "id", deskId));
    }
}
