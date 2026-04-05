package com.cbs.regulatory.service;

import com.cbs.common.audit.CurrentActorProvider;
import com.cbs.common.exception.BusinessException;
import com.cbs.regulatory.dto.RegulatoryRequests;
import com.cbs.regulatory.entity.RegulatoryDomainEnums;
import com.cbs.regulatory.entity.RegulatoryReturn;
import com.cbs.regulatory.entity.RegulatoryReturnLineItem;
import com.cbs.regulatory.entity.RegulatoryReturnTemplate;
import com.cbs.regulatory.entity.ReturnAuditEvent;
import com.cbs.regulatory.repository.RegulatoryReturnLineItemRepository;
import com.cbs.regulatory.repository.RegulatoryReturnRepository;
import com.cbs.regulatory.repository.RegulatoryReturnTemplateRepository;
import com.cbs.regulatory.repository.ReturnAuditEventRepository;
import com.cbs.tenant.service.CurrentTenantResolver;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RegulatoryReturnWorkflowServiceTest {

    @Mock private RegulatoryReturnRepository returnRepository;
    @Mock private RegulatoryReturnLineItemRepository lineItemRepository;
    @Mock private RegulatoryReturnTemplateRepository templateRepository;
    @Mock private ReturnAuditEventRepository auditEventRepository;
    @Mock private RegulatoryTemplateEngine templateEngine;
    @Mock private RegulatorySubmissionClient submissionClient;
    @Mock private RegulatoryDeadlineService deadlineService;
    @Mock private RegulatoryReferenceService referenceService;
    @Mock private CurrentActorProvider actorProvider;
    @Mock private CurrentTenantResolver tenantResolver;

    @InjectMocks
    private RegulatoryReturnWorkflowService workflowService;

    @Test
    void approveReturn_enforcesFourEyes() {
        RegulatoryReturn regulatoryReturn = RegulatoryReturn.builder()
                .id(1L)
                .generatedBy("maker")
                .status(RegulatoryDomainEnums.ReturnStatus.VALIDATED)
                .build();
        when(returnRepository.findById(1L)).thenReturn(Optional.of(regulatoryReturn));

        assertThatThrownBy(() -> workflowService.approveReturn(1L, "maker"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Approver must be different");
    }

    @Test
    void createAmendment_linksBackToOriginalReturn() {
        RegulatoryReturn original = RegulatoryReturn.builder()
                .id(5L)
                .returnRef("RET-5")
                .templateId(7L)
                .templateCode("SAMA-BS-ISL-V1")
                .jurisdiction(RegulatoryDomainEnums.Jurisdiction.SA_SAMA)
                .returnType(RegulatoryDomainEnums.ReturnType.BALANCE_SHEET)
                .reportingPeriodType(RegulatoryDomainEnums.ReportingPeriodType.MONTHLY)
                .periodFrom(LocalDate.of(2026, 3, 1))
                .periodTo(LocalDate.of(2026, 3, 31))
                .reportingDate(LocalDate.of(2026, 3, 31))
                .currencyCode("SAR")
                .dataExtractionStatus(RegulatoryDomainEnums.DataExtractionStatus.COMPLETED)
                .validationStatus(RegulatoryDomainEnums.ReturnValidationStatus.VALID)
                .crossValidationStatus(RegulatoryDomainEnums.CrossValidationStatus.PASSED)
                .filingDeadline(LocalDate.of(2026, 4, 15))
                .build();
        when(returnRepository.findById(5L)).thenReturn(Optional.of(original));
        when(actorProvider.getCurrentActor()).thenReturn("checker");
        when(tenantResolver.getCurrentTenantIdOrDefault(1L)).thenReturn(1L);
        when(referenceService.nextAmendmentRef("RET-5")).thenReturn("RET-5-AMD-001");
        when(returnRepository.save(any(RegulatoryReturn.class))).thenAnswer(invocation -> {
            RegulatoryReturn saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(6L);
            }
            return saved;
        });
        when(lineItemRepository.findByReturnIdOrderBySectionCodeAscLineNumberAsc(5L)).thenReturn(List.of(
                RegulatoryReturnLineItem.builder()
                        .id(10L)
                        .returnId(5L)
                        .lineNumber("L001")
                        .sectionCode("ASSETS")
                        .lineDescription("Cash")
                        .dataType(RegulatoryDomainEnums.ReturnLineDataType.AMOUNT)
                        .value("100.00")
                        .build()
        ));

        RegulatoryReturn amendment = workflowService.createAmendment(5L, "Regulator requested clarification");

        assertThat(amendment.getOriginalReturnId()).isEqualTo(5L);
        assertThat(amendment.getIsAmendment()).isTrue();
        assertThat(amendment.getStatus()).isEqualTo(RegulatoryDomainEnums.ReturnStatus.DRAFT);
        verify(lineItemRepository).save(any(RegulatoryReturnLineItem.class));
        verify(auditEventRepository).save(any(ReturnAuditEvent.class));
    }

    @Test
    void submitToRegulator_persistsSubmissionAttemptAndResponse() throws Exception {
        RegulatoryReturn regulatoryReturn = RegulatoryReturn.builder()
                .id(11L)
                .templateId(9L)
                .templateCode("SAMA-CAR-ISL-V1")
                .returnRef("RET-11")
                .status(RegulatoryDomainEnums.ReturnStatus.APPROVED)
                .generatedBy("maker")
                .filingDeadline(LocalDate.of(2026, 4, 15))
                .build();
        RegulatoryReturnTemplate template = RegulatoryReturnTemplate.builder()
                .id(9L)
                .templateCode("SAMA-CAR-ISL-V1")
                .jurisdiction(RegulatoryDomainEnums.Jurisdiction.SA_SAMA)
                .returnType(RegulatoryDomainEnums.ReturnType.CAPITAL_ADEQUACY)
                .outputFormat(RegulatoryDomainEnums.OutputFormat.XBRL)
                .regulatorPortalUrl("https://eprudential.sama.gov.sa/api/returns")
                .submissionConfig(java.util.Map.of("defaultMethod", "API"))
                .build();
        RegulatoryTemplateEngine.ExportArtifact artifact = new RegulatoryTemplateEngine.ExportArtifact(
                "<xml/>".getBytes(), "application/xml", "RET-11.xml", java.util.Map.of("returnRef", "RET-11"));
        RegulatoryRequests.SubmissionDetails details = RegulatoryRequests.SubmissionDetails.builder()
                .submittedBy("compliance.user")
                .submissionMethod("API")
                .build();

        when(returnRepository.findById(11L)).thenReturn(Optional.of(regulatoryReturn));
        when(templateRepository.findById(9L)).thenReturn(Optional.of(template));
        when(templateEngine.prepareExportArtifact(11L, RegulatoryDomainEnums.OutputFormat.XBRL)).thenReturn(artifact);
        when(tenantResolver.getCurrentTenantIdOrDefault(1L)).thenReturn(1L);
        when(actorProvider.getCurrentActor()).thenReturn("compliance.user");
        when(submissionClient.submit(eq(template), eq(regulatoryReturn), eq(artifact), eq(details), eq(1L)))
                .thenReturn(RegulatorySubmissionClient.SubmissionResult.builder()
                        .success(true)
                        .preparedOnly(false)
                        .statusCode(202)
                        .submittedAt(LocalDateTime.of(2026, 4, 10, 10, 0))
                        .endpoint("https://eprudential.sama.gov.sa/api/returns")
                        .contentType("application/xml")
                        .responseBody("{\"accepted\":true}")
                        .regulatorReferenceNumber("SAMA-ACK-001")
                        .responseHeaders(java.util.Map.of("X-Reference", java.util.List.of("SAMA-ACK-001")))
                        .durationMs(45)
                        .build());
        when(returnRepository.save(any(RegulatoryReturn.class))).thenAnswer(invocation -> invocation.getArgument(0));

        workflowService.submitToRegulator(11L, details);

        assertThat(regulatoryReturn.getStatus()).isEqualTo(RegulatoryDomainEnums.ReturnStatus.SUBMITTED);
        assertThat(regulatoryReturn.getSubmissionAttemptCount()).isEqualTo(1);
        assertThat(regulatoryReturn.getRegulatorReferenceNumber()).isEqualTo("SAMA-ACK-001");
        assertThat(regulatoryReturn.getSubmissionPayload()).contains("<xml/>");
        assertThat(regulatoryReturn.getSubmissionResponse()).containsEntry("statusCode", 202);
    }
}
