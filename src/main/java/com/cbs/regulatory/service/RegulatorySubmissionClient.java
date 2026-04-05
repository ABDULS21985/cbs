package com.cbs.regulatory.service;

import com.cbs.governance.entity.SystemParameter;
import com.cbs.governance.repository.SystemParameterRepository;
import com.cbs.regulatory.dto.RegulatoryRequests;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RegulatorySubmissionClient {

    private final SystemParameterRepository systemParameterRepository;

    public SubmissionResult submit(RegulatoryReturnTemplate template,
                                   RegulatoryReturn regulatoryReturn,
                                   RegulatoryTemplateEngine.ExportArtifact artifact,
                                   RegulatoryRequests.SubmissionDetails details,
                                   Long tenantId) {
        RegulatoryDomainEnums.SubmissionMethod method = resolveMethod(template, details);
        String endpoint = resolveEndpoint(template, details);
        if (method == RegulatoryDomainEnums.SubmissionMethod.MANUAL || method == RegulatoryDomainEnums.SubmissionMethod.EMAIL) {
            return SubmissionResult.builder()
                    .success(true)
                    .preparedOnly(true)
                    .statusCode(0)
                    .submittedAt(LocalDateTime.now())
                    .endpoint(endpoint)
                    .contentType(artifact.contentType())
                    .responseBody(method.name() + "_PREPARED")
                    .regulatorReferenceNumber(details != null ? details.getRegulatorReferenceNumber() : null)
                    .responseHeaders(Map.of())
                    .build();
        }

        if (!StringUtils.hasText(endpoint)) {
            return SubmissionResult.builder()
                    .success(false)
                    .preparedOnly(false)
                    .statusCode(0)
                    .submittedAt(LocalDateTime.now())
                    .endpoint(null)
                    .contentType(artifact.contentType())
                    .responseBody("No regulator endpoint configured for submission")
                    .responseHeaders(Map.of())
                    .build();
        }

        long start = System.currentTimeMillis();
        try {
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(Duration.ofMillis(resolveTimeout(template)))
                    .header("Content-Type", artifact.contentType())
                    .header("Accept", artifact.contentType())
                    .header("X-Return-Ref", regulatoryReturn.getReturnRef())
                    .header("X-Template-Code", regulatoryReturn.getTemplateCode())
                    .header("X-Regulator-Form", Optional.ofNullable(template.getRegulatorFormNumber()).orElse(""))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(artifact.body()));

            resolveHeaders(template, details, tenantId).forEach(requestBuilder::header);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            HttpResponse<String> response = client.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            String reference = resolveReference(template, details, response);
            return SubmissionResult.builder()
                    .success(response.statusCode() >= 200 && response.statusCode() < 300)
                    .preparedOnly(false)
                    .statusCode(response.statusCode())
                    .submittedAt(LocalDateTime.now())
                    .endpoint(endpoint)
                    .contentType(artifact.contentType())
                    .responseBody(response.body())
                    .regulatorReferenceNumber(reference)
                    .responseHeaders(response.headers().map())
                    .durationMs((int) (System.currentTimeMillis() - start))
                    .build();
        } catch (Exception ex) {
            log.warn("Regulatory submission failed for return {}: {}", regulatoryReturn.getReturnRef(), ex.getMessage());
            return SubmissionResult.builder()
                    .success(false)
                    .preparedOnly(false)
                    .statusCode(0)
                    .submittedAt(LocalDateTime.now())
                    .endpoint(endpoint)
                    .contentType(artifact.contentType())
                    .responseBody("Submission failed: " + ex.getMessage())
                    .responseHeaders(Map.of())
                    .durationMs((int) (System.currentTimeMillis() - start))
                    .build();
        }
    }

    private RegulatoryDomainEnums.SubmissionMethod resolveMethod(RegulatoryReturnTemplate template,
                                                                 RegulatoryRequests.SubmissionDetails details) {
        if (details != null && StringUtils.hasText(details.getSubmissionMethod())) {
            return RegulatoryDomainEnums.SubmissionMethod.valueOf(details.getSubmissionMethod().trim().toUpperCase(Locale.ROOT));
        }
        Object configured = template.getSubmissionConfig() != null ? template.getSubmissionConfig().get("defaultMethod") : null;
        if (configured != null) {
            return RegulatoryDomainEnums.SubmissionMethod.valueOf(String.valueOf(configured).trim().toUpperCase(Locale.ROOT));
        }
        return RegulatoryDomainEnums.SubmissionMethod.API;
    }

    private String resolveEndpoint(RegulatoryReturnTemplate template, RegulatoryRequests.SubmissionDetails details) {
        if (details != null && StringUtils.hasText(details.getEndpointOverride())) {
            return details.getEndpointOverride().trim();
        }
        if (details != null && StringUtils.hasText(details.getRegulatorPortal())) {
            return details.getRegulatorPortal().trim();
        }
        Object configured = template.getSubmissionConfig() != null ? template.getSubmissionConfig().get("endpoint") : null;
        if (configured != null && StringUtils.hasText(String.valueOf(configured))) {
            return String.valueOf(configured).trim();
        }
        return template.getRegulatorPortalUrl();
    }

    private Map<String, String> resolveHeaders(RegulatoryReturnTemplate template,
                                               RegulatoryRequests.SubmissionDetails details,
                                               Long tenantId) {
        Map<String, String> headers = new LinkedHashMap<>();
        if (template.getSubmissionConfig() != null && template.getSubmissionConfig().get("headers") instanceof Map<?, ?> configHeaders) {
            configHeaders.forEach((key, value) -> headers.put(String.valueOf(key), String.valueOf(value)));
        }
        if (details != null && details.getHeaders() != null) {
            headers.putAll(details.getHeaders());
        }
        if (template.getSubmissionConfig() != null && template.getSubmissionConfig().get("authTokenParameterKey") != null) {
            String parameterKey = String.valueOf(template.getSubmissionConfig().get("authTokenParameterKey"));
            List<SystemParameter> params = systemParameterRepository.findEffective(parameterKey, tenantId);
            if (!params.isEmpty()) {
                String headerName = String.valueOf(template.getSubmissionConfig().getOrDefault("authHeader", "Authorization"));
                String prefix = String.valueOf(template.getSubmissionConfig().getOrDefault("authPrefix", "Bearer "));
                headers.put(headerName, prefix + params.getFirst().getParamValue());
            }
        }
        return headers;
    }

    private long resolveTimeout(RegulatoryReturnTemplate template) {
        if (template.getSubmissionConfig() != null && template.getSubmissionConfig().get("timeoutMs") != null) {
            try {
                return Long.parseLong(String.valueOf(template.getSubmissionConfig().get("timeoutMs")));
            } catch (NumberFormatException ignored) {
                return 30000L;
            }
        }
        return 30000L;
    }

    private String resolveReference(RegulatoryReturnTemplate template,
                                    RegulatoryRequests.SubmissionDetails details,
                                    HttpResponse<String> response) {
        if (details != null && StringUtils.hasText(details.getRegulatorReferenceNumber())) {
            return details.getRegulatorReferenceNumber();
        }
        if (template.getSubmissionConfig() != null && template.getSubmissionConfig().get("referenceHeader") != null) {
            String headerName = String.valueOf(template.getSubmissionConfig().get("referenceHeader"));
            Optional<String> headerValue = response.headers().firstValue(headerName);
            if (headerValue.isPresent()) {
                return headerValue.get();
            }
        }
        return response.headers().firstValue("X-Reference")
                .or(() -> response.headers().firstValue("X-Regulator-Reference"))
                .orElse(null);
    }

    @lombok.Builder
    public record SubmissionResult(
            boolean success,
            boolean preparedOnly,
            int statusCode,
            LocalDateTime submittedAt,
            String endpoint,
            String contentType,
            String responseBody,
            String regulatorReferenceNumber,
            Map<String, List<String>> responseHeaders,
            Integer durationMs
    ) {
    }
}
