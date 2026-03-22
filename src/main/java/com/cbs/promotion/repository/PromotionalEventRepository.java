package com.cbs.promotion.repository;

import com.cbs.promotion.entity.PromotionalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository("promotionPromotionalEventRepository")
public interface PromotionalEventRepository extends JpaRepository<PromotionalEvent, Long> {

    Optional<PromotionalEvent> findByPromoCode(String promoCode);

    List<PromotionalEvent> findByStatus(String status);

    List<PromotionalEvent> findByEventType(String eventType);

    List<PromotionalEvent> findByStatusAndStartDateBeforeAndEndDateAfter(
            String status, LocalDate now1, LocalDate now2);
}
