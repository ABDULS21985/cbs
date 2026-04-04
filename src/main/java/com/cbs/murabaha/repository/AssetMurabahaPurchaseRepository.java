package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.AssetMurabahaPurchase;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetMurabahaPurchaseRepository extends JpaRepository<AssetMurabahaPurchase, Long> {

    Optional<AssetMurabahaPurchase> findByPurchaseRef(String purchaseRef);

    Optional<AssetMurabahaPurchase> findByContractId(Long contractId);

    List<AssetMurabahaPurchase> findByOwnershipVerifiedFalse();

    List<AssetMurabahaPurchase> findByOverallStatus(MurabahaDomainEnums.AssetPurchaseOverallStatus overallStatus);
}
