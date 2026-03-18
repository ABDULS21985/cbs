package com.cbs.productinventory;

import com.cbs.common.exception.BusinessException;
import com.cbs.productinventory.entity.ProductInventoryItem;
import com.cbs.productinventory.repository.ProductInventoryItemRepository;
import com.cbs.productinventory.service.ProductInventoryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductInventoryServiceTest {
    @Mock private ProductInventoryItemRepository repository;
    @InjectMocks private ProductInventoryService service;

    @Test @DisplayName("Issue reduces available stock and sets LOW_STOCK at reorder level")
    void issueReducesStock() {
        ProductInventoryItem item = new ProductInventoryItem();
        item.setId(1L);
        item.setItemCode("PI-TEST");
        item.setTotalStock(100);
        item.setAllocatedStock(80);
        item.setAvailableStock(20);
        item.setReorderLevel(10);
        when(repository.findByItemCode("PI-TEST")).thenReturn(Optional.of(item));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        ProductInventoryItem result = service.issue("PI-TEST", 10);
        assertThat(result.getAvailableStock()).isEqualTo(10);
        assertThat(result.getAllocatedStock()).isEqualTo(90);
        assertThat(result.getStatus()).isEqualTo("LOW_STOCK");
    }

    @Test @DisplayName("Issue rejects when insufficient stock")
    void issueRejectsInsufficientStock() {
        ProductInventoryItem item = new ProductInventoryItem();
        item.setId(1L);
        item.setItemCode("PI-EMPTY");
        item.setAvailableStock(5);
        when(repository.findByItemCode("PI-EMPTY")).thenReturn(Optional.of(item));
        assertThatThrownBy(() -> service.issue("PI-EMPTY", 10))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Insufficient stock");
    }
}
