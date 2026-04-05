package com.cbs.ijarah.repository;

import com.cbs.ijarah.entity.IjarahAsset;
import com.cbs.ijarah.entity.IjarahDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /** Find assets that were acquired on or before asOfDate and not disposed before asOfDate */
    @Query("""
            SELECT a FROM IjarahAsset a
            WHERE a.acquisitionDate IS NOT NULL
            AND a.acquisitionDate <= :asOfDate
            AND (a.disposalDate IS NULL OR a.disposalDate >= :asOfDate)
            """)
    List<IjarahAsset> findActiveAssetsAsOfDate(@Param("asOfDate") LocalDate asOfDate);

    /** Find assets that have active insurance (non-null premium > 0 and non-null expiry) */
    @Query("""
            SELECT a FROM IjarahAsset a
            WHERE a.insurancePremiumAnnual IS NOT NULL
            AND a.insurancePremiumAnnual > 0
            AND a.insuranceExpiryDate IS NOT NULL
            """)
    List<IjarahAsset> findAssetsWithActiveInsurance();
}
