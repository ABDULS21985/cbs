package com.cbs.promo.repository;
import com.cbs.promo.entity.PromotionalEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List; import java.util.Optional;
@Repository("promoPromotionalEventRepository")
public interface PromotionalEventRepository extends JpaRepository<PromotionalEvent, Long> {
    Optional<PromotionalEvent> findByEventCode(String code);
    List<PromotionalEvent> findByStatusOrderByStartDateAsc(String status);
    List<PromotionalEvent> findByEventTypeAndStatusOrderByStartDateAsc(String type, String status);
}
