package com.cbs.integration;

import com.cbs.integration.entity.*;
import com.cbs.integration.repository.*;
import com.cbs.integration.service.Iso20022Service;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class Iso20022ServiceTest {

    @Mock private Iso20022MessageRepository messageRepository;
    @Mock private Iso20022CodeSetRepository codeSetRepository;
    @InjectMocks private Iso20022Service iso20022Service;

    @Test
    @DisplayName("Valid pacs.008 message passes validation")
    void validPacs008() {
        when(messageRepository.save(any())).thenAnswer(inv -> { Iso20022Message m = inv.getArgument(0); m.setId(1L); return m; });

        Iso20022Message msg = Iso20022Message.builder()
                .messageDefinition("pacs.008.001.10").direction("OUTBOUND")
                .senderBic("DEUTDEFFXXX").receiverBic("BNPAFRPPXXX")
                .creationDateTime(Instant.now()).numberOfTxns(1)
                .totalAmount(new BigDecimal("50000.00")).currency("EUR").build();

        Iso20022Message result = iso20022Service.ingestMessage(msg);
        assertThat(result.getValidationStatus()).isEqualTo("VALID");
        assertThat(result.getMessageCategory()).isEqualTo("PAYMENTS");
        assertThat(result.getMessageFunction()).isEqualTo("CREDIT_TRANSFER");
    }

    @Test
    @DisplayName("Invalid BIC format triggers business error")
    void invalidBic() {
        when(messageRepository.save(any())).thenAnswer(inv -> { Iso20022Message m = inv.getArgument(0); m.setId(1L); return m; });

        Iso20022Message msg = Iso20022Message.builder()
                .messageDefinition("pacs.008.001.10").direction("OUTBOUND")
                .senderBic("INVALID").receiverBic("BNPAFRPPXXX")
                .creationDateTime(Instant.now()).numberOfTxns(1)
                .totalAmount(new BigDecimal("1000.00")).currency("USD").build();

        Iso20022Message result = iso20022Service.ingestMessage(msg);
        assertThat(result.getValidationStatus()).isEqualTo("BUSINESS_ERROR");
        assertThat(result.getValidationErrors()).anyMatch(e -> e.contains("BIC"));
    }

    @Test
    @DisplayName("SWIFT MT103 maps to pacs.008.001.10")
    void swiftMapping() {
        assertThat(iso20022Service.getSwiftToIsoMapping().get("MT103")).isEqualTo("pacs.008.001.10");
        assertThat(iso20022Service.getSwiftToIsoMapping().get("MT940")).isEqualTo("camt.053.001.11");
    }

    @Test
    @DisplayName("Code set lookup returns display name")
    void codeSetLookup() {
        when(codeSetRepository.findByCodeSetNameAndCode("ExternalPurpose1Code", "SALA"))
                .thenReturn(Optional.of(Iso20022CodeSet.builder().code("SALA").displayName("Salary Payment").build()));

        String result = iso20022Service.lookupCode("ExternalPurpose1Code", "SALA");
        assertThat(result).isEqualTo("Salary Payment");
    }
}
