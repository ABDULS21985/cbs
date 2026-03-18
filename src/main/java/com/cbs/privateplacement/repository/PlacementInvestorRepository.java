package com.cbs.privateplacement.repository;
import com.cbs.privateplacement.entity.PlacementInvestor; import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PlacementInvestorRepository extends JpaRepository<PlacementInvestor, Long> {
    List<PlacementInvestor> findByPlacementIdOrderByCommitmentAmountDesc(Long placementId);
    List<PlacementInvestor> findByPlacementIdAndStatus(Long placementId, String status);
}
