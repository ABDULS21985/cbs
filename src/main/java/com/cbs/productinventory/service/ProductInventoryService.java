package com.cbs.productinventory.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.productinventory.entity.ProductInventoryItem;
import com.cbs.productinventory.repository.ProductInventoryItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ProductInventoryService {
    private final ProductInventoryItemRepository repository;

    @Transactional
    public ProductInventoryItem create(ProductInventoryItem item) {
        item.setItemCode("PI-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        item.setAvailableStock(item.getTotalStock() - item.getAllocatedStock());
        recalculateStatus(item);
        return repository.save(item);
    }

    @Transactional
    public ProductInventoryItem issue(String itemCode, int quantity) {
        ProductInventoryItem item = getByCode(itemCode);
        if (item.getAvailableStock() < quantity) {
            throw new BusinessException("Insufficient stock for " + itemCode + ": available=" + item.getAvailableStock() + ", requested=" + quantity);
        }
        item.setAvailableStock(item.getAvailableStock() - quantity);
        item.setAllocatedStock(item.getAllocatedStock() + quantity);
        item.setLastIssuedAt(Instant.now());
        recalculateStatus(item);
        return repository.save(item);
    }

    @Transactional
    public ProductInventoryItem replenish(String itemCode, int quantity) {
        ProductInventoryItem item = getByCode(itemCode);
        item.setTotalStock(item.getTotalStock() + quantity);
        item.setAvailableStock(item.getAvailableStock() + quantity);
        item.setLastReplenishedAt(Instant.now());
        recalculateStatus(item);
        return repository.save(item);
    }

    public List<ProductInventoryItem> getLowStock() {
        return repository.findByStatusInOrderByAvailableStockAsc(List.of("LOW_STOCK", "OUT_OF_STOCK"));
    }

    public List<ProductInventoryItem> getByBranch(Long branchId) {
        return repository.findByBranchIdAndStatusOrderByItemNameAsc(branchId, "ACTIVE");
    }

    public ProductInventoryItem getByCode(String code) {
        return repository.findByItemCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("ProductInventoryItem", "itemCode", code));
    }

    private void recalculateStatus(ProductInventoryItem item) {
        if (item.getAvailableStock() <= 0) {
            item.setStatus("OUT_OF_STOCK");
        } else if (item.getAvailableStock() <= item.getReorderLevel()) {
            item.setStatus("LOW_STOCK");
        } else {
            item.setStatus("ACTIVE");
        }
    }
}
