package com.cbs.issueddevice.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.issueddevice.entity.IssuedDevice;
import com.cbs.issueddevice.repository.IssuedDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class IssuedDeviceService {
    private final IssuedDeviceRepository repository;

    @Transactional
    public IssuedDevice issue(IssuedDevice device) {
        device.setDeviceCode("DEV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        device.setActivationStatus("INACTIVE");
        device.setIssuedAt(Instant.now());
        return repository.save(device);
    }

    @Transactional
    public IssuedDevice activate(String deviceCode) {
        IssuedDevice device = getByCode(deviceCode);
        if (!"INACTIVE".equals(device.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be INACTIVE to activate, current: " + device.getActivationStatus());
        }
        device.setActivationStatus("ACTIVE");
        device.setActivatedAt(Instant.now());
        return repository.save(device);
    }

    @Transactional
    public IssuedDevice block(String deviceCode, String reason) {
        IssuedDevice device = getByCode(deviceCode);
        device.setActivationStatus("BLOCKED");
        device.setReplacementReason(reason);
        return repository.save(device);
    }

    @Transactional
    public IssuedDevice replace(String deviceCode, String reason) {
        IssuedDevice old = getByCode(deviceCode);
        old.setActivationStatus("EXPIRED");
        old.setReplacementReason(reason);

        IssuedDevice newDevice = new IssuedDevice();
        newDevice.setDeviceCode("DEV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        newDevice.setCustomerId(old.getCustomerId());
        newDevice.setDeviceType(old.getDeviceType());
        newDevice.setDeviceIdentifier(old.getDeviceIdentifier());
        newDevice.setLinkedAccountId(old.getLinkedAccountId());
        newDevice.setIssuedBranchId(old.getIssuedBranchId());
        newDevice.setActivationStatus("INACTIVE");
        newDevice.setIssuedAt(Instant.now());
        IssuedDevice saved = repository.save(newDevice);

        old.setReplacedByCode(saved.getDeviceCode());
        repository.save(old);

        return saved;
    }

    @Transactional
    public IssuedDevice unblock(String deviceCode) {
        IssuedDevice device = getByCode(deviceCode);
        if (!"BLOCKED".equals(device.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be BLOCKED to unblock, current: " + device.getActivationStatus());
        }
        device.setActivationStatus("ACTIVE");
        return repository.save(device);
    }

    public List<IssuedDevice> getAll() {
        return repository.findAll();
    }

    public List<IssuedDevice> getByCustomer(Long customerId) {
        return repository.findByCustomerIdAndActivationStatusOrderByIssuedAtDesc(customerId, "ACTIVE");
    }

    public IssuedDevice getByCode(String code) {
        return repository.findByDeviceCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("IssuedDevice", "deviceCode", code));
    }
}
