package com.cbs.promo.repository;
import com.cbs.promo.entity.PromotionalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface PromotionalEventRepository extends JpaRepository<PromotionalEvent, Long> {
    Optional<PromotionalEvent> findByEventCode(String code);
    List<PromotionalEvent> findByStatusOrderByStartDateAsc(String status);
    List<PromotionalEvent> findByEventTypeAndStatusOrderByStartDateAsc(String type, String status);
}
