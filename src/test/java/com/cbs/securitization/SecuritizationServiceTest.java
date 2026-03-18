package com.cbs.securitization;

import com.cbs.securitization.entity.SecuritizationVehicle;
import com.cbs.securitization.repository.SecuritizationVehicleRepository;
import com.cbs.securitization.service.SecuritizationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecuritizationServiceTest {

    @Mock private SecuritizationVehicleRepository vehicleRepository;
    @InjectMocks private SecuritizationService service;

    @Test @DisplayName("Vehicle creation generates code")
    void createVehicle() {
        when(vehicleRepository.save(any())).thenAnswer(inv -> { SecuritizationVehicle v = inv.getArgument(0); v.setId(1L); return v; });
        SecuritizationVehicle v = SecuritizationVehicle.builder().vehicleName("Mortgage Pool 2026-A")
                .vehicleType("RMBS").underlyingAssetType("MORTGAGE").totalPoolBalance(new BigDecimal("500000000")).numberOfAssets(2500).build();
        SecuritizationVehicle result = service.create(v);
        assertThat(result.getVehicleCode()).startsWith("SEC-");
    }

    @Test @DisplayName("Issuance sets status and issue date")
    void issueVehicle() {
        SecuritizationVehicle v = SecuritizationVehicle.builder().id(1L).vehicleCode("SEC-TEST").status("RATED").build();
        when(vehicleRepository.findByVehicleCode("SEC-TEST")).thenReturn(Optional.of(v));
        when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SecuritizationVehicle result = service.issue("SEC-TEST");
        assertThat(result.getStatus()).isEqualTo("ISSUED");
        assertThat(result.getIssueDate()).isNotNull();
    }
}
