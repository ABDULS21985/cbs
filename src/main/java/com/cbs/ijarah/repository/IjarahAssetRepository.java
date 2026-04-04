package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IjarahAssetRepository extends JpaRepository<IjarahAsset, Long> {

    Optional<IjarahAsset> findByAssetRef(String assetRef);

    Optional<IjarahAsset> findByIjarahContractId(Long ijarahContractId);

    List<IjarahAsset> findByAssetCategory(IjarahDomainEnums.AssetCategory assetCategory);

    List<IjarahAsset> findByStatus(IjarahDomainEnums.AssetStatus status);

    List<IjarahAsset> findByInsuranceExpiryDateBefore(LocalDate date);

    List<IjarahAsset> findByNextMaintenanceDueDateBefore(LocalDate date);

    @Query("select coalesce(sum(a.netBookValue), 0) from IjarahAsset a where a.status in :statuses")
    java.math.BigDecimal sumNetBookValueByStatusIn(List<IjarahDomainEnums.AssetStatus> statuses);
}
