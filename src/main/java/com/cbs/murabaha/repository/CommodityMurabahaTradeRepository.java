package com.cbs.murabaha.repository;

import com.cbs.murabaha.entity.CommodityMurabahaTrade;
import com.cbs.murabaha.entity.MurabahaDomainEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommodityMurabahaTradeRepository extends JpaRepository<CommodityMurabahaTrade, Long> {

    Optional<CommodityMurabahaTrade> findByTradeRef(String tradeRef);

    Optional<CommodityMurabahaTrade> findByContractId(Long contractId);

    List<CommodityMurabahaTrade> findByOverallStatus(MurabahaDomainEnums.CommodityTradeStatus overallStatus);

    List<CommodityMurabahaTrade> findByOwnershipVerifiedAtIsNullAndOverallStatus(
            MurabahaDomainEnums.CommodityTradeStatus overallStatus
    );
}
