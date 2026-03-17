package com.cbs.security;

import com.cbs.security.entity.MaskingPolicy;
import com.cbs.security.repository.MaskingPolicyRepository;
import com.cbs.security.repository.PiiFieldRegistryRepository;
import com.cbs.security.service.DataMaskingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DataMaskingServiceTest {

    @Mock private MaskingPolicyRepository policyRepository;
    @Mock private PiiFieldRegistryRepository piiRegistry;
    @InjectMocks private DataMaskingService maskingService;

    @Test
    @DisplayName("Partial mask: card number shows last 4 digits")
    void partialMaskCardNumber() {
        MaskingPolicy policy = MaskingPolicy.builder()
                .policyName("mask-card").entityType("CARD").fieldName("card_number")
                .maskingStrategy("PARTIAL_MASK").maskPattern("****-****-****-{last4}")
                .appliesToRoles(List.of("CBS_OFFICER")).appliesToChannels(List.of("API"))
                .isActive(true).build();

        String result = maskingService.applyMask(policy, "4532015112830366");
        assertThat(result).isEqualTo("****-****-****-0366");
    }

    @Test
    @DisplayName("Email mask: shows first 2 chars + domain")
    void partialMaskEmail() {
        MaskingPolicy policy = MaskingPolicy.builder()
                .maskingStrategy("PARTIAL_MASK").maskPattern("{first2}***@{domain}").build();

        String result = maskingService.applyMask(policy, "john.doe@example.com");
        assertThat(result).isEqualTo("jo***@example.com");
    }

    @Test
    @DisplayName("Tokenize strategy produces deterministic token")
    void tokenizeProducesDeterministicToken() {
        MaskingPolicy policy = MaskingPolicy.builder().maskingStrategy("TOKENIZE").build();

        String result1 = maskingService.applyMask(policy, "1234");
        String result2 = maskingService.applyMask(policy, "1234");
        assertThat(result1).startsWith("TKN-");
        assertThat(result1).isEqualTo(result2); // deterministic
    }

    @Test
    @DisplayName("Entity masking applies only to roles in policy")
    void entityMaskingRoleAware() {
        MaskingPolicy cardPolicy = MaskingPolicy.builder()
                .policyName("mask-card").entityType("CARD").fieldName("card_number")
                .maskingStrategy("PARTIAL_MASK").maskPattern("****-****-****-{last4}")
                .appliesToRoles(List.of("CBS_OFFICER")).appliesToChannels(List.of("API"))
                .isActive(true).build();

        when(policyRepository.findByEntityTypeAndIsActiveTrueOrderByFieldNameAsc("CARD"))
                .thenReturn(List.of(cardPolicy));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("card_number", "4532015112830366");
        data.put("holder_name", "John Doe");

        // CBS_OFFICER sees masked data
        Map<String, Object> maskedOfficer = maskingService.maskEntity("CARD", data, "CBS_OFFICER", "API");
        assertThat(maskedOfficer.get("card_number")).isEqualTo("****-****-****-0366");
        assertThat(maskedOfficer.get("holder_name")).isEqualTo("John Doe"); // not masked

        // CBS_ADMIN not in applies_to_roles → sees real data (privileged)
        Map<String, Object> unmaskedAdmin = maskingService.maskEntity("CARD", data, "CBS_ADMIN", "API");
        assertThat(unmaskedAdmin.get("card_number")).isEqualTo("4532015112830366");
    }

    @Test
    @DisplayName("Full mask strategy replaces entire value")
    void fullMask() {
        MaskingPolicy policy = MaskingPolicy.builder()
                .maskingStrategy("FULL_MASK").maskPattern("***REDACTED***").build();

        String result = maskingService.applyMask(policy, "sensitive-biometric-data");
        assertThat(result).isEqualTo("***REDACTED***");
    }

    @Test
    @DisplayName("Format-preserving mask maintains structure")
    void formatPreservingMask() {
        MaskingPolicy policy = MaskingPolicy.builder().maskingStrategy("FORMAT_PRESERVING").build();

        String result = maskingService.applyMask(policy, "AB-1234");
        assertThat(result).hasSize(7);
        assertThat(result.charAt(2)).isEqualTo('-'); // structure preserved
        assertThat(result).isNotEqualTo("AB-1234"); // values changed
    }
}
