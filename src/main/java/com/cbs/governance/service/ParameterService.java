package com.cbs.governance.service;

import com.cbs.common.exception.BusinessException;
import com.cbs.common.exception.ResourceNotFoundException;
import com.cbs.governance.entity.*;
import com.cbs.governance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service @RequiredArgsConstructor @Slf4j @Transactional(readOnly = true)
public class ParameterService {

    private final SystemParameterRepository parameterRepository;
    private final ParameterAuditRepository auditRepository;

    /**
     * Hierarchical lookup: tenant-specific → global.
     * Returns the most specific effective parameter.
     */
    public SystemParameter getParameter(String key, Long tenantId) {
        List<SystemParameter> params = parameterRepository.findEffective(key, tenantId);
        if (params.isEmpty()) {
            throw new ResourceNotFoundException("SystemParameter", "paramKey", key);
        }
        return params.getFirst(); // most specific (tenant > global)
    }

    public String getValue(String key) {
        return parameterRepository.findByParamKeyAndTenantIdIsNullAndIsActiveTrue(key)
                .map(SystemParameter::getParamValue)
                .orElseThrow(() -> new ResourceNotFoundException("SystemParameter", "paramKey", key));
    }

    public int getIntValue(String key) { return Integer.parseInt(getValue(key)); }
    public double getDecimalValue(String key) { return Double.parseDouble(getValue(key)); }
    public boolean getBoolValue(String key) { return Boolean.parseBoolean(getValue(key)); }

    @Transactional
    public SystemParameter createParameter(SystemParameter param, String createdBy) {
        param.setLastModifiedBy(createdBy);
        param.setApprovalStatus("APPROVED"); // auto-approve on creation
        SystemParameter saved = parameterRepository.save(param);
        auditRepository.save(ParameterAudit.builder()
                .parameterId(saved.getId()).newValue(saved.getParamValue())
                .changedBy(createdBy).changeReason("Initial creation").build());
        log.info("Parameter created: key={}, category={}, value={}", saved.getParamKey(), saved.getParamCategory(), saved.getParamValue());
        return saved;
    }

    @Transactional
    public SystemParameter updateParameter(Long parameterId, String newValue, String changedBy, String reason) {
        SystemParameter param = parameterRepository.findById(parameterId)
                .orElseThrow(() -> new ResourceNotFoundException("SystemParameter", "id", parameterId));

        String oldValue = param.getParamValue();
        validateType(newValue, param.getValueType());

        param.setParamValue(newValue);
        param.setLastModifiedBy(changedBy);
        param.setApprovalStatus("PENDING_APPROVAL"); // maker-checker
        param.setUpdatedAt(Instant.now());

        auditRepository.save(ParameterAudit.builder()
                .parameterId(parameterId).oldValue(oldValue).newValue(newValue)
                .changedBy(changedBy).changeReason(reason).build());

        log.info("Parameter updated (pending approval): key={}, old={}, new={}, by={}",
                param.getParamKey(), oldValue, newValue, changedBy);
        return parameterRepository.save(param);
    }

    @Transactional
    public SystemParameter approveParameter(Long parameterId, String approvedBy) {
        SystemParameter param = parameterRepository.findById(parameterId)
                .orElseThrow(() -> new ResourceNotFoundException("SystemParameter", "id", parameterId));
        if (!"PENDING_APPROVAL".equals(param.getApprovalStatus())) {
            throw new BusinessException("Parameter is not pending approval: " + param.getApprovalStatus());
        }
        if (approvedBy.equals(param.getLastModifiedBy())) {
            throw new BusinessException("Same user cannot make and approve the change (maker-checker)");
        }
        param.setApprovalStatus("APPROVED");
        param.setApprovedBy(approvedBy);
        log.info("Parameter approved: key={}, by={}", param.getParamKey(), approvedBy);
        return parameterRepository.save(param);
    }

    public List<SystemParameter> getByCategory(String category) {
        return parameterRepository.findByParamCategoryAndIsActiveTrueOrderByParamKeyAsc(category);
    }

    public List<SystemParameter> getAll() {
        return parameterRepository.findByIsActiveTrueOrderByParamCategoryAscParamKeyAsc();
    }

    public List<ParameterAudit> getAuditTrail(Long parameterId) {
        return auditRepository.findByParameterIdOrderByCreatedAtDesc(parameterId);
    }

    private void validateType(String value, String valueType) {
        try {
            switch (valueType) {
                case "INTEGER" -> Integer.parseInt(value);
                case "DECIMAL" -> Double.parseDouble(value);
                case "BOOLEAN" -> { if (!"true".equals(value) && !"false".equals(value)) throw new NumberFormatException(); }
            }
        } catch (NumberFormatException e) {
            throw new BusinessException("Invalid value '" + value + "' for type " + valueType);
        }
    }
}
