package com.cbs.counterparty;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.counterparty.entity.Counterparty;
import com.cbs.counterparty.repository.CounterpartyRepository;
import com.cbs.counterparty.service.CounterpartyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CounterpartyServiceTest {

    @Mock private CounterpartyRepository counterpartyRepository;
    @InjectMocks private CounterpartyService service;

    // ── create ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("create - generates code starting with CP- and calculates availableLimit = totalExposureLimit - currentExposure")
    void create_generatesCodeAndCalculatesAvailableLimit() {
        when(counterpartyRepository.save(any())).thenAnswer(inv -> {
            Counterparty cp = inv.getArgument(0);
            cp.setId(1L);
            return cp;
        });

        Counterparty cp = Counterparty.builder()
                .counterpartyName("Bank A")
                .counterpartyType("BANK")
                .country("US")
                .totalExposureLimit(new BigDecimal("50000000"))
                .build();
        // currentExposure defaults to BigDecimal.ZERO via @Builder.Default

        Counterparty result = service.create(cp);

        assertThat(result.getCounterpartyCode()).startsWith("CP-");
        assertThat(result.getCounterpartyCode()).hasSize(13); // "CP-" + 10 chars
        assertThat(result.getAvailableLimit())
                .isEqualByComparingTo(new BigDecimal("50000000")); // 50M - 0
        verify(counterpartyRepository).save(cp);
    }

    // ── updateExposure ──────────────────────────────────────────────────

    @Test
    @DisplayName("updateExposure - updates exposure and recalculates availableLimit")
    void updateExposure_updatesExposureAndAvailableLimit() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-UPD");
        cp.setTotalExposureLimit(new BigDecimal("10000000"));
        cp.setCurrentExposure(BigDecimal.ZERO);

        when(counterpartyRepository.findByCounterpartyCode("CP-UPD")).thenReturn(Optional.of(cp));
        when(counterpartyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Counterparty result = service.updateExposure("CP-UPD", new BigDecimal("7000000"));

        assertThat(result.getCurrentExposure()).isEqualByComparingTo(new BigDecimal("7000000"));
        assertThat(result.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("3000000"));
    }

    @Test
    @DisplayName("updateExposure - logs warning when exposure breaches limit, availableLimit is negative")
    void updateExposure_logsWarningWhenBreached() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-BREACH");
        cp.setTotalExposureLimit(new BigDecimal("10000000"));
        cp.setCurrentExposure(BigDecimal.ZERO);

        when(counterpartyRepository.findByCounterpartyCode("CP-BREACH")).thenReturn(Optional.of(cp));
        when(counterpartyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Counterparty result = service.updateExposure("CP-BREACH", new BigDecimal("12000000"));

        // No exception thrown -- the service just logs a warning
        assertThat(result.getAvailableLimit()).isEqualByComparingTo(new BigDecimal("-2000000"));
        assertThat(result.getAvailableLimit().signum()).isEqualTo(-1);
    }

    // ── verifyKyc ───────────────────────────────────────────────────────

    @Test
    @DisplayName("verifyKyc - sets KYC status to VERIFIED for a regular counterparty")
    void verifyKyc_setsVerifiedStatus() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-OK");
        cp.setRiskCategory("MEDIUM");
        cp.setKycStatus("PENDING");

        when(counterpartyRepository.findByCounterpartyCode("CP-OK")).thenReturn(Optional.of(cp));
        when(counterpartyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Counterparty result = service.verifyKyc("CP-OK");

        assertThat(result.getKycStatus()).isEqualTo("VERIFIED");
        verify(counterpartyRepository).save(cp);
    }

    @Test
    @DisplayName("verifyKyc - throws BusinessException for PROHIBITED counterparty")
    void verifyKyc_throwsForProhibitedCounterparty() {
        Counterparty cp = new Counterparty();
        cp.setId(1L);
        cp.setCounterpartyCode("CP-BAD");
        cp.setRiskCategory("PROHIBITED");

        when(counterpartyRepository.findByCounterpartyCode("CP-BAD")).thenReturn(Optional.of(cp));

        assertThatThrownBy(() -> service.verifyKyc("CP-BAD"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("PROHIBITED");

        verify(counterpartyRepository, never()).save(any());
    }

    // ── getByCode ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getByCode - throws ResourceNotFoundException when code not found")
    void getByCode_throwsResourceNotFound() {
        when(counterpartyRepository.findByCounterpartyCode("CP-MISSING"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByCode("CP-MISSING"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Counterparty")
                .hasMessageContaining("CP-MISSING");
    }

    // ── getAll ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("getAll - delegates to findAllByOrderByCounterpartyNameAsc")
    void getAll_returnsAllCounterparties() {
        Counterparty cp1 = new Counterparty();
        cp1.setCounterpartyName("Alpha");
        Counterparty cp2 = new Counterparty();
        cp2.setCounterpartyName("Beta");

        when(counterpartyRepository.findAllByOrderByCounterpartyNameAsc())
                .thenReturn(List.of(cp1, cp2));

        List<Counterparty> result = service.getAll();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getCounterpartyName()).isEqualTo("Alpha");
        verify(counterpartyRepository).findAllByOrderByCounterpartyNameAsc();
    }

    // ── getByType ───────────────────────────────────────────────────────

    @Test
    @DisplayName("getByType - filters by type and ACTIVE status")
    void getByType_filtersActiveByType() {
        Counterparty cp = new Counterparty();
        cp.setCounterpartyType("BANK");
        cp.setStatus("ACTIVE");

        when(counterpartyRepository.findByCounterpartyTypeAndStatusOrderByCounterpartyNameAsc("BANK", "ACTIVE"))
                .thenReturn(List.of(cp));

        List<Counterparty> result = service.getByType("BANK");

        assertThat(result).hasSize(1);
        verify(counterpartyRepository)
                .findByCounterpartyTypeAndStatusOrderByCounterpartyNameAsc("BANK", "ACTIVE");
    }
}
