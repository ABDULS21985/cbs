package com.cbs.trade.repository;

import com.cbs.trade.entity.FactoringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FactoringTransactionRepository extends JpaRepository<FactoringTransaction, Long> {
    List<FactoringTransaction> findByFacilityId(Long facilityId);
    List<FactoringTransaction> findByFacilityIdAndStatus(Long facilityId, String status);
    List<FactoringTransaction> findByBuyerId(Long buyerId);
    Optional<FactoringTransaction> findByInvoiceRefAndFacilityId(String invoiceRef, Long facilityId);
}
