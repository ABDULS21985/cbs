package com.cbs.securitization.service;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.securitization.entity.SecuritizationVehicle;
import com.cbs.securitization.repository.SecuritizationVehicleRepository;
import lombok.RequiredArgsConstructor; import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.time.Instant; import java.time.LocalDate; import java.util.*;
@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class SecuritizationService {
    private final SecuritizationVehicleRepository vehicleRepository;
    @Transactional
    public SecuritizationVehicle create(SecuritizationVehicle vehicle) {
        vehicle.setVehicleCode("SEC-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        log.info("Securitization vehicle created: code={}, type={}, pool={}", vehicle.getVehicleCode(), vehicle.getVehicleType(), vehicle.getTotalPoolBalance());
        return vehicleRepository.save(vehicle);
    }
    @Transactional
    public SecuritizationVehicle issue(String vehicleCode) {
        SecuritizationVehicle v = getVehicle(vehicleCode);
        v.setStatus("ISSUED"); v.setIssueDate(LocalDate.now()); v.setUpdatedAt(Instant.now());
        return vehicleRepository.save(v);
    }
    public List<SecuritizationVehicle> getByType(String type) { return vehicleRepository.findByVehicleTypeAndStatusOrderByVehicleNameAsc(type, "ISSUED"); }
    public List<SecuritizationVehicle> getActive() { return vehicleRepository.findByStatusOrderByVehicleNameAsc("ISSUED"); }
    private SecuritizationVehicle getVehicle(String code) { return vehicleRepository.findByVehicleCode(code).orElseThrow(() -> new ResourceNotFoundException("SecuritizationVehicle", "vehicleCode", code)); }
}
