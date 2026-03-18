package com.cbs.promo.service;
import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.promo.entity.PromotionalEvent;
import com.cbs.promo.repository.PromotionalEventRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class PromoService {
    private final PromotionalEventRepository repository;
    @Transactional
    public PromotionalEvent create(PromotionalEvent event) {
        event.setEventCode("PRE-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        event.setStatus("PLANNED");
        return repository.save(event);
    }
    @Transactional
    public PromotionalEvent activate(String code) {
        PromotionalEvent e = getByCode(code); e.setStatus("ACTIVE"); return repository.save(e);
    }
    @Transactional
    public PromotionalEvent recordRedemption(String code) {
        PromotionalEvent e = getByCode(code);
        if (e.getMaxRedemptions() != null && e.getCurrentRedemptions() >= e.getMaxRedemptions()) throw new BusinessException("Max redemptions reached for " + code);
        e.setCurrentRedemptions(e.getCurrentRedemptions() + 1);
        return repository.save(e);
    }
    public List<PromotionalEvent> getActive() { return repository.findByStatusOrderByStartDateAsc("ACTIVE"); }
    public List<PromotionalEvent> getByType(String type) { return repository.findByEventTypeAndStatusOrderByStartDateAsc(type, "ACTIVE"); }
    public PromotionalEvent getByCode(String code) {
        return repository.findByEventCode(code).orElseThrow(() -> new ResourceNotFoundException("PromotionalEvent", "eventCode", code));
    }
}
