package com.cbs.leasingitem.repository;
import com.cbs.leasingitem.entity.LeasedAsset; import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate; import java.util.List; import java.util.Optional;
public interface LeasedAssetRepository extends JpaRepository<LeasedAsset, Long> {
    Optional<LeasedAsset> findByAssetCode(String code);
    List<LeasedAsset> findAllByOrderByAssetCodeAsc();
    List<LeasedAsset> findByLeaseContractIdOrderByAssetCodeAsc(Long contractId);
    List<LeasedAsset> findByLeaseContractIdAndStatusOrderByAssetCodeAsc(Long contractId, String status);
    List<LeasedAsset> findByNextInspectionDueBeforeAndStatusOrderByNextInspectionDueAsc(LocalDate date, String status);
}
