package com.cbs.accountsreceivable;

import com.cbs.accountsreceivable.entity.ReceivableInvoice;
import com.cbs.accountsreceivable.repository.ReceivableInvoiceRepository;
import com.cbs.accountsreceivable.service.ReceivableInvoiceService;
import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.gl.service.GeneralLedgerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceivableInvoiceServiceTest {
    @Mock private ReceivableInvoiceRepository repository;
    @Mock private GeneralLedgerService generalLedgerService;
    @Mock private CurrentActorProvider currentActorProvider;
    @InjectMocks private ReceivableInvoiceService service;

    @Test @DisplayName("Full payment sets PAID + paidAt + outstanding=0")
    void fullPayment() {
        ReceivableInvoice inv = new ReceivableInvoice();
        inv.setId(1L);
        inv.setInvoiceNumber("INV-TEST");
        inv.setNetAmount(new BigDecimal("1000"));
        inv.setOutstandingAmount(new BigDecimal("1000"));
        inv.setPaidAmount(BigDecimal.ZERO);
        inv.setStatus("ISSUED");
        when(repository.findByInvoiceNumber("INV-TEST")).thenReturn(Optional.of(inv));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(currentActorProvider.getCurrentActor()).thenReturn("test-user");
        ReceivableInvoice result = service.recordPayment("INV-TEST", new BigDecimal("1000"));
        assertThat(result.getStatus()).isEqualTo("PAID");
        assertThat(result.getPaidAt()).isNotNull();
        assertThat(result.getOutstandingAmount()).isEqualByComparingTo("0");
    }

    @Test @DisplayName("Partial payment sets PARTIALLY_PAID and reduces outstanding")
    void partialPayment() {
        ReceivableInvoice inv = new ReceivableInvoice();
        inv.setId(1L);
        inv.setInvoiceNumber("INV-PART");
        inv.setNetAmount(new BigDecimal("1000"));
        inv.setOutstandingAmount(new BigDecimal("1000"));
        inv.setPaidAmount(BigDecimal.ZERO);
        inv.setStatus("ISSUED");
        when(repository.findByInvoiceNumber("INV-PART")).thenReturn(Optional.of(inv));
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(currentActorProvider.getCurrentActor()).thenReturn("test-user");
        ReceivableInvoice result = service.recordPayment("INV-PART", new BigDecimal("400"));
        assertThat(result.getStatus()).isEqualTo("PARTIALLY_PAID");
        assertThat(result.getOutstandingAmount()).isEqualByComparingTo("600");
        assertThat(result.getPaidAmount()).isEqualByComparingTo("400");
    }
}
