package com.cbs.marketmaking.service;

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

    @Transactional
    public MarketMakingMandate createMandate(MarketMakingMandate mandate) {
        mandate.setMandateCode("MM-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        return mandateRepository.save(mandate);
    }

    @Transactional
    public MarketMakingActivity recordDailyActivity(String mandateCode, MarketMakingActivity activity) {
        MarketMakingMandate mandate = getByCode(mandateCode);
        activity.setMandateId(mandate.getId());

        // Auto-calc fillRatioPct
        if (activity.getQuotesPublished() != null && activity.getQuotesPublished() > 0 && activity.getQuotesHit() != null) {
            BigDecimal fillRatio = BigDecimal.valueOf(activity.getQuotesHit())
                    .divide(BigDecimal.valueOf(activity.getQuotesPublished()), 4, RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"))
                    .setScale(2, RoundingMode.HALF_UP);
            activity.setFillRatioPct(fillRatio);
        }

        return activityRepository.save(activity);
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
    public MarketMakingMandate suspendMandate(String mandateCode) {
        MarketMakingMandate mandate = getByCode(mandateCode);
        mandate.setStatus("SUSPENDED");
        return mandateRepository.save(mandate);
    }

    private MarketMakingMandate getByCode(String code) {
        return mandateRepository.findByMandateCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("MarketMakingMandate", "mandateCode", code));
    }
}
