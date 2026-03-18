package com.cbs.capitalmarkets.repository;
import com.cbs.capitalmarkets.entity.CapitalMarketDeal; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional;
public interface CapitalMarketDealRepository extends JpaRepository<CapitalMarketDeal, Long> {
    Optional<CapitalMarketDeal> findByDealCode(String dealCode);
    List<CapitalMarketDeal> findByStatusOrderByMandateDateDesc(String status);
    List<CapitalMarketDeal> findByMarketTypeAndStatusInOrderByMandateDateDesc(String marketType, List<String> statuses);
    List<CapitalMarketDeal> findByStatusInOrderByMandateDateDesc(List<String> statuses);
}
