package com.cbs.merchant.repository;

import com.cbs.merchant.entity.MerchantSettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface MerchantSettlementRepository extends JpaRepository<MerchantSettlement, Long> {
    List<MerchantSettlement> findByMerchantIdOrderBySettlementDateDesc(Long merchantId);
    List<MerchantSettlement> findByMerchantIdAndSettlementDate(Long merchantId, LocalDate settlementDate);
    List<MerchantSettlement> findByStatus(String status);
}
