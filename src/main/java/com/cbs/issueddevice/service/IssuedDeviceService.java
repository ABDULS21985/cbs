package com.cbs.issueddevice.service;

import com.cbs.common.audit.CurrentActorProvider;
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
    private final CurrentActorProvider currentActorProvider;

    @Transactional
    public IssuedDevice issue(IssuedDevice device) {
        // Field validation
        if (device.getCustomerId() == null) {
            throw new BusinessException("Customer ID is required", "MISSING_CUSTOMER_ID");
        }
        if (device.getDeviceType() == null || device.getDeviceType().isBlank()) {
            throw new BusinessException("Device type is required", "MISSING_DEVICE_TYPE");
        }
        if (device.getDeviceIdentifier() == null || device.getDeviceIdentifier().isBlank()) {
            throw new BusinessException("Device identifier is required", "MISSING_DEVICE_IDENTIFIER");
        }
        // Duplicate device check: same identifier for same customer
        List<IssuedDevice> existingDevices = repository.findByCustomerIdAndActivationStatusOrderByIssuedAtDesc(
                device.getCustomerId(), "ACTIVE");
        boolean duplicate = existingDevices.stream()
                .anyMatch(d -> device.getDeviceIdentifier().equals(d.getDeviceIdentifier()));
        if (duplicate) {
            throw new BusinessException("Device with identifier " + device.getDeviceIdentifier()
                    + " is already active for customer " + device.getCustomerId(), "DUPLICATE_DEVICE");
        }
        device.setDeviceCode("DEV-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        device.setActivationStatus("INACTIVE");
        device.setIssuedAt(Instant.now());
        IssuedDevice saved = repository.save(device);
        log.info("AUDIT: Device issued: code={}, customer={}, type={}, actor={}",
                saved.getDeviceCode(), saved.getCustomerId(), saved.getDeviceType(), currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IssuedDevice activate(String deviceCode) {
        IssuedDevice device = getByCode(deviceCode);
        if (!"INACTIVE".equals(device.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be INACTIVE to activate, current: " + device.getActivationStatus());
        }
        device.setActivationStatus("ACTIVE");
        device.setActivatedAt(Instant.now());
        IssuedDevice saved = repository.save(device);
        log.info("AUDIT: Device activated: code={}, actor={}", deviceCode, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IssuedDevice block(String deviceCode, String reason) {
        IssuedDevice device = getByCode(deviceCode);
        // State validation: only ACTIVE devices can be blocked
        if (!"ACTIVE".equals(device.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be ACTIVE to block, current: " + device.getActivationStatus(), "INVALID_STATUS");
        }
        device.setActivationStatus("BLOCKED");
        device.setReplacementReason(reason);
        IssuedDevice saved = repository.save(device);
        log.info("AUDIT: Device blocked: code={}, reason={}, actor={}",
                deviceCode, reason, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IssuedDevice replace(String deviceCode, String reason) {
        IssuedDevice old = getByCode(deviceCode);
        // State validation: only ACTIVE or BLOCKED devices can be replaced
        if (!"ACTIVE".equals(old.getActivationStatus()) && !"BLOCKED".equals(old.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be ACTIVE or BLOCKED to replace, current: " + old.getActivationStatus(), "INVALID_STATUS");
        }
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

        log.info("AUDIT: Device replaced: old={}, new={}, reason={}, actor={}",
                deviceCode, saved.getDeviceCode(), reason, currentActorProvider.getCurrentActor());
        return saved;
    }

    @Transactional
    public IssuedDevice unblock(String deviceCode) {
        IssuedDevice device = getByCode(deviceCode);
        if (!"BLOCKED".equals(device.getActivationStatus())) {
            throw new BusinessException("Device " + deviceCode + " must be BLOCKED to unblock, current: " + device.getActivationStatus());
        }
        device.setActivationStatus("ACTIVE");
        IssuedDevice saved = repository.save(device);
        log.info("AUDIT: Device unblocked: code={}, actor={}", deviceCode, currentActorProvider.getCurrentActor());
        return saved;
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
