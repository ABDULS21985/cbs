package com.cbs.productinventory.repository;

import com.cbs.productinventory.entity.ProductInventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductInventoryItemRepository extends JpaRepository<ProductInventoryItem, Long> {
    Optional<ProductInventoryItem> findByItemCode(String code);
    List<ProductInventoryItem> findByBranchIdAndStatusOrderByItemNameAsc(Long branchId, String status);
    List<ProductInventoryItem> findByStatusInOrderByAvailableStockAsc(List<String> statuses);
}
