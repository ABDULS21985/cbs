package com.cbs.openitem;

import com.cbs.common.exception.BusinessException;
import com.cbs.openitem.entity.OpenItem;
import com.cbs.openitem.repository.OpenItemRepository;
import com.cbs.openitem.service.OpenItemService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenItemServiceTest {
    @Mock private OpenItemRepository repository;
    @Mock private com.cbs.common.audit.CurrentActorProvider currentActorProvider;
    @InjectMocks private OpenItemService service;

    @Test @DisplayName("Creation sets aging=0 and generates code")
    void createSetsDefaults() {
        OpenItem item = new OpenItem();
        item.setItemType("SUSPENSE_ENTRY");
        item.setItemCategory("PAYMENT");
        item.setDescription("Unmatched payment");
        item.setAmount(new BigDecimal("5000"));
        item.setValueDate(LocalDate.now());
        item.setCurrency("USD");
        when(repository.save(any())).thenAnswer(inv -> { OpenItem i = inv.getArgument(0); i.setId(1L); return i; });
        OpenItem result = service.create(item);
        assertThat(result.getItemCode()).startsWith("OI-");
        assertThat(result.getAgingDays()).isEqualTo(0);
        assertThat(result.getStatus()).isEqualTo("OPEN");
    }

    @Test @DisplayName("Resolve rejects already-resolved items")
    void resolveRejectsResolved() {
        OpenItem item = new OpenItem();
        item.setId(1L);
        item.setItemCode("OI-TEST");
        item.setStatus("RESOLVED");
        when(repository.findByItemCode("OI-TEST")).thenReturn(Optional.of(item));
        assertThatThrownBy(() -> service.resolve("OI-TEST", "MATCHED", "Already done"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("already RESOLVED");
    }
}
