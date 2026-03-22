package com.cbs.promotion.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.promotion.entity.PromotionalEvent;
import com.cbs.promotion.repository.PromotionalEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class PromotionService {

    private final PromotionalEventRepository repository;

    public List<PromotionalEvent> getActivePromotions() {
        LocalDate now = LocalDate.now();
        return repository.findByStatusAndStartDateBeforeAndEndDateAfter("ACTIVE", now, now);
    }

    public List<PromotionalEvent> getByEventType(String eventType) {
        return repository.findByEventType(eventType);
    }

    public PromotionalEvent findByPromoCode(String promoCode) {
        return repository.findByPromoCode(promoCode)
                .orElseThrow(() -> new ResourceNotFoundException("PromotionalEvent", "promoCode", promoCode));
    }

    @Transactional
    public PromotionalEvent activate(String promoCode) {
        PromotionalEvent event = findByPromoCode(promoCode);

        if (!"DRAFT".equals(event.getStatus()) && !"PAUSED".equals(event.getStatus())) {
            throw new BusinessException(
                    "Promotion can only be activated from DRAFT or PAUSED status, current: " + event.getStatus(),
                    "INVALID_STATUS_TRANSITION");
        }

        event.setStatus("ACTIVE");
        event.setUpdatedAt(LocalDateTime.now());
        log.info("Activated promotion: {}", promoCode);
        return repository.save(event);
    }

    @Transactional
    public PromotionalEvent redeem(String promoCode) {
        PromotionalEvent event = findByPromoCode(promoCode);

        if (!"ACTIVE".equals(event.getStatus())) {
            throw new BusinessException(
                    "Only ACTIVE promotions can be redeemed, current: " + event.getStatus(),
                    "PROMOTION_NOT_ACTIVE");
        }

        LocalDate now = LocalDate.now();
        if (event.getEndDate() != null && now.isAfter(event.getEndDate())) {
            throw new BusinessException("Promotion has expired", "PROMOTION_EXPIRED");
        }

        if (event.getMaxRedemptions() > 0 && event.getCurrentRedemptions() >= event.getMaxRedemptions()) {
            throw new BusinessException("Promotion has reached maximum redemptions", "MAX_REDEMPTIONS_REACHED");
        }

        event.setCurrentRedemptions(event.getCurrentRedemptions() + 1);
        event.setUpdatedAt(LocalDateTime.now());
        log.info("Redeemed promotion: {} (redemption #{})", promoCode, event.getCurrentRedemptions());
        return repository.save(event);
    }
}
