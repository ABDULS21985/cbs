package com.cbs.corrbank;

import com.cbs.corrbank.entity.CorrespondentBank;
import com.cbs.corrbank.repository.CorrespondentBankRepository;
import com.cbs.corrbank.service.CorrespondentBankService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorrespondentBankServiceTest {

    @Mock private CorrespondentBankRepository bankRepository;
    @InjectMocks private CorrespondentBankService service;

    @Test @DisplayName("BIC lookup returns correspondent bank with relationship type")
    void bicLookup() {
        CorrespondentBank bank = new CorrespondentBank();
        bank.setId(1L);
        bank.setBankCode("CB-001");
        bank.setBankName("Citibank New York");
        bank.setBicCode("CITIUS33");
        bank.setCountry("US");
        bank.setRelationshipType("NOSTRO");
        when(bankRepository.findByBicCode("CITIUS33")).thenReturn(Optional.of(bank));

        CorrespondentBank result = service.getByBic("CITIUS33");
        assertThat(result.getBankName()).isEqualTo("Citibank New York");
        assertThat(result.getRelationshipType()).isEqualTo("NOSTRO");
    }
}
