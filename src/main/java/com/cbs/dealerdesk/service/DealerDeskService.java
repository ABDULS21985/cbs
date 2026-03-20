package com.cbs.dealerdesk.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.common.audit.CurrentActorProvider;
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
import java.time.Instant;
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
    private final CurrentActorProvider currentActorProvider;

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

    public List<DealingDesk> getAllDesks() {
        return deskRepository.findAll();
    }

    public DealingDesk getDesk(Long deskId) {
        return findDeskOrThrow(deskId);
    }

    public List<DeskDealer> getDeskDealers(Long deskId) {
        return dealerRepository.findByDeskId(deskId);
    }

    @Transactional
    public DealingDesk suspendDesk(Long deskId) {
        return suspendDesk(deskId, null);
    }

    @Transactional
    public DealingDesk suspendDesk(Long deskId, String reason) {
        DealingDesk desk = findDeskOrThrow(deskId);
        desk.setStatus("SUSPENDED");
        desk.setSuspensionReason(reason);
        desk.setSuspendedBy(currentActorProvider.getCurrentActor());
        desk.setSuspendedAt(Instant.now());
        log.info("Desk {} suspended by {} with reason={}", desk.getDeskCode(), desk.getSuspendedBy(), reason);
        return deskRepository.save(desk);
    }

    @Transactional
    public DealingDesk activateDesk(Long deskId) {
        DealingDesk desk = findDeskOrThrow(deskId);
        desk.setStatus("ACTIVE");
        desk.setActivatedBy(currentActorProvider.getCurrentActor());
        desk.setActivatedAt(Instant.now());
        desk.setSuspensionReason(null);
        desk.setSuspendedBy(null);
        desk.setSuspendedAt(null);
        log.info("Desk {} activated by {}", desk.getDeskCode(), desk.getActivatedBy());
        return deskRepository.save(desk);
    }

    @Transactional
    public DealingDesk updateDesk(Long deskId, DealingDesk changes) {
        DealingDesk desk = findDeskOrThrow(deskId);
        if (changes.getDeskName() != null) {
            desk.setDeskName(changes.getDeskName());
        }
        if (changes.getDeskType() != null) {
            desk.setDeskType(changes.getDeskType());
        }
        if (changes.getHeadDealerName() != null) {
            desk.setHeadDealerName(changes.getHeadDealerName());
        }
        if (changes.getHeadDealerEmployeeId() != null) {
            desk.setHeadDealerEmployeeId(changes.getHeadDealerEmployeeId());
        }
        if (changes.getLocation() != null) {
            desk.setLocation(changes.getLocation());
        }
        if (changes.getTimezone() != null) {
            desk.setTimezone(changes.getTimezone());
        }
        if (changes.getTradingHoursStart() != null) {
            desk.setTradingHoursStart(changes.getTradingHoursStart());
        }
        if (changes.getTradingHoursEnd() != null) {
            desk.setTradingHoursEnd(changes.getTradingHoursEnd());
        }
        if (changes.getTradingDays() != null) {
            desk.setTradingDays(changes.getTradingDays());
        }
        if (changes.getSupportedInstruments() != null) {
            desk.setSupportedInstruments(changes.getSupportedInstruments());
        }
        if (changes.getSupportedCurrencies() != null) {
            desk.setSupportedCurrencies(changes.getSupportedCurrencies());
        }
        if (changes.getMaxOpenPositionLimit() != null) {
            desk.setMaxOpenPositionLimit(changes.getMaxOpenPositionLimit());
        }
        if (changes.getMaxSingleTradeLimit() != null) {
            desk.setMaxSingleTradeLimit(changes.getMaxSingleTradeLimit());
        }
        if (changes.getDailyVarLimit() != null) {
            desk.setDailyVarLimit(changes.getDailyVarLimit());
        }
        if (changes.getStopLossLimit() != null) {
            desk.setStopLossLimit(changes.getStopLossLimit());
        }
        if (changes.getPnlCurrency() != null) {
            desk.setPnlCurrency(changes.getPnlCurrency());
        }
        return deskRepository.save(desk);
    }

    private DealingDesk findDeskOrThrow(Long deskId) {
        return deskRepository.findById(deskId)
                .orElseThrow(() -> new ResourceNotFoundException("DealingDesk", "id", deskId));
    }
}
