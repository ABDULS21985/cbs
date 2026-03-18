package com.cbs.capitalmarkets.repository;
import com.cbs.capitalmarkets.entity.DealInvestor; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DealInvestorRepository extends JpaRepository<DealInvestor, Long> {
    List<DealInvestor> findByDealIdOrderByBidAmountDesc(Long dealId);
    List<DealInvestor> findByDealIdAndStatus(Long dealId, String status);
}
