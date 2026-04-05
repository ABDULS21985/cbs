package com.cbs.marketmaking.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.marketmaking.entity.MarketMakingActivity;
import com.cbs.marketmaking.entity.MarketMakingMandate;
import com.cbs.marketmaking.repository.MarketMakingActivityRepository;
import com.cbs.marketmaking.repository.MarketMakingMandateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MarketMakingService {

    private final MarketMakingMandateRepository mandateRepository;
    private final MarketMakingActivityRepository activityRepository;
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public MarketMakingMandate createMandate(MarketMakingMandate mandate) {
        mandate.setMandateCode("MM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        // Validate spread against minimum
        if (mandate.getMaxSpreadBps() != null && mandate.getMaxSpreadBps().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("maxSpreadBps must be positive", "INVALID_SPREAD");
        }
        if (mandate.getInventoryLimit() != null && mandate.getInventoryLimit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("inventoryLimit must be positive", "INVALID_INVENTORY_LIMIT");
        }
        MarketMakingMandate saved = mandateRepository.save(mandate);
        log.info("AUDIT: Market making mandate created by {}: code={}, instrument={}, exchange={}",
                currentActorProvider.getCurrentActor(), saved.getMandateCode(), saved.getInstrumentCode(), saved.getExchange());
        return saved;
    }

    @Transactional
    public MarketMakingActivity recordDailyActivity(String mandateCode, MarketMakingActivity activity) {
        MarketMakingMandate mandate = getByCode(mandateCode);
        if (!"ACTIVE".equals(mandate.getStatus())) {
            throw new BusinessException("Mandate " + mandateCode + " is not ACTIVE; current status: " + mandate.getStatus(), "MANDATE_NOT_ACTIVE");
        }
        activity.setMandateId(mandate.getId());

        // Validate spread against mandate minimum
        if (activity.getAvgBidAskSpreadBps() != null && mandate.getMaxSpreadBps() != null
                && activity.getAvgBidAskSpreadBps().compareTo(mandate.getMaxSpreadBps()) > 0) {
            log.warn("AUDIT: Spread violation on mandate {}: avgBidAskSpreadBps={} exceeds maxSpreadBps={}",
                    mandateCode, activity.getAvgBidAskSpreadBps(), mandate.getMaxSpreadBps());
        }

        // Position limit check
        if (activity.getNetPosition() != null && mandate.getInventoryLimit() != null
                && activity.getNetPosition().abs().compareTo(mandate.getInventoryLimit()) > 0) {
            log.warn("AUDIT: Position limit breach on mandate {}: position={} exceeds inventoryLimit={}",
                    mandateCode, activity.getNetPosition(), mandate.getInventoryLimit());
        }

        // Auto-calc fillRatioPct
        if (activity.getQuotesPublished() != null && activity.getQuotesPublished() > 0 && activity.getQuotesHit() != null) {
            BigDecimal fillRatio = BigDecimal.valueOf(activity.getQuotesHit())
                    .divide(BigDecimal.valueOf(activity.getQuotesPublished()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            activity.setFillRatioPct(fillRatio);
        }

        // P&L calculation: if realized and unrealized P&L available, compute total
        if (activity.getRealizedPnl() != null && activity.getUnrealizedPnl() != null) {
            BigDecimal totalPnl = activity.getRealizedPnl().add(activity.getUnrealizedPnl());
            log.info("Market making P&L for mandate {}: realized={}, unrealized={}, total={}",
                    mandateCode, activity.getRealizedPnl(), activity.getUnrealizedPnl(), totalPnl);
        }

        MarketMakingActivity saved = activityRepository.save(activity);
        log.info("AUDIT: Daily activity recorded by {}: mandate={}, date={}, quotesPublished={}, quotesHit={}",
                currentActorProvider.getCurrentActor(), mandateCode, activity.getActivityDate(),
                activity.getQuotesPublished(), activity.getQuotesHit());
        return saved;
    }

    public List<MarketMakingMandate> getActiveMandates() {
        return mandateRepository.findByStatusOrderByMandateNameAsc("ACTIVE");
    }

    public List<MarketMakingActivity> getMandatePerformance(String mandateCode) {
        MarketMakingMandate mandate = getByCode(mandateCode);
        return activityRepository.findByMandateIdOrderByActivityDateDesc(mandate.getId());
    }

    public List<MarketMakingActivity> getObligationComplianceReport() {
        return activityRepository.findByObligationMetFalseOrderByActivityDateDesc();
    }

    @Transactional
    public MarketMakingMandate suspendMandate(String mandateCode, String reason) {
        MarketMakingMandate mandate = getByCode(mandateCode);
        if ("SUSPENDED".equals(mandate.getStatus())) {
            throw new BusinessException("Mandate " + mandateCode + " is already SUSPENDED", "ALREADY_SUSPENDED");
        }
        mandate.setStatus("SUSPENDED");
        log.info("AUDIT: Market making mandate suspended by {}: code={}, reason={}",
                currentActorProvider.getCurrentActor(), mandateCode, reason);
        return mandateRepository.save(mandate);
    }

    private MarketMakingMandate getByCode(String code) {
        return mandateRepository.findByMandateCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketMakingMandate", "mandateCode", code));
    }
}
