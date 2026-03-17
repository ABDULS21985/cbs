package com.cbs.governance;

import com.cbs.common.exception.BusinessException;
import com.cbs.governance.entity.*;
import com.cbs.governance.repository.*;
import com.cbs.governance.service.ParameterService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ParameterServiceTest {

    @Mock private SystemParameterRepository parameterRepository;
    @Mock private ParameterAuditRepository auditRepository;
    @InjectMocks private ParameterService service;

    @Test
    @DisplayName("Maker-checker: same user cannot make and approve change")
    void makerCheckerEnforced() {
        SystemParameter param = SystemParameter.builder().id(1L).paramKey("limit.daily")
                .paramValue("5000000").valueType("DECIMAL")
                .approvalStatus("PENDING_APPROVAL").lastModifiedBy("user_a").build();
        when(parameterRepository.findById(1L)).thenReturn(Optional.of(param));

        assertThatThrownBy(() -> service.approveParameter(1L, "user_a"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("maker-checker");
    }

    @Test
    @DisplayName("Different user can approve pending parameter change")
    void approvalByDifferentUser() {
        SystemParameter param = SystemParameter.builder().id(1L).paramKey("limit.daily")
                .paramValue("5000000").valueType("DECIMAL")
                .approvalStatus("PENDING_APPROVAL").lastModifiedBy("user_a").build();
        when(parameterRepository.findById(1L)).thenReturn(Optional.of(param));
        when(parameterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        SystemParameter approved = service.approveParameter(1L, "user_b");
        assertThat(approved.getApprovalStatus()).isEqualTo("APPROVED");
        assertThat(approved.getApprovedBy()).isEqualTo("user_b");
    }

    @Test
    @DisplayName("Type validation rejects non-integer for INTEGER parameter")
    void typeValidation() {
        SystemParameter param = SystemParameter.builder().id(1L).paramKey("system.timeout")
                .paramValue("30").valueType("INTEGER").approvalStatus("APPROVED").build();
        when(parameterRepository.findById(1L)).thenReturn(Optional.of(param));

        assertThatThrownBy(() -> service.updateParameter(1L, "not-a-number", "admin", "test"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Invalid value");
    }
}
