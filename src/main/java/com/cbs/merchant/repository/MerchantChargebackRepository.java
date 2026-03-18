package com.cbs.merchant.repository;

import com.cbs.merchant.entity.MerchantChargeback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MerchantChargebackRepository extends JpaRepository<MerchantChargeback, Long> {
    List<MerchantChargeback> findByMerchantIdOrderByTransactionDateDesc(Long merchantId);
    List<MerchantChargeback> findByStatus(String status);
    List<MerchantChargeback> findByMerchantIdAndStatus(Long merchantId, String status);
}
