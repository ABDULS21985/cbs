package com.cbs.issueddevice.repository;

import com.cbs.issueddevice.entity.IssuedDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface IssuedDeviceRepository extends JpaRepository<IssuedDevice, Long> {
    Optional<IssuedDevice> findByDeviceCode(String code);
    List<IssuedDevice> findByCustomerIdAndActivationStatusOrderByIssuedAtDesc(Long customerId, String status);
    List<IssuedDevice> findByDeviceTypeAndActivationStatusOrderByExpiryDateAsc(String deviceType, String status);
}
