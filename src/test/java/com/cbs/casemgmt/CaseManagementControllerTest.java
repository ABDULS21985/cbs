package com.cbs.casemgmt;

import com.cbs.casemgmt.entity.CustomerCase;
import com.cbs.casemgmt.entity.CaseNote;
import com.cbs.casemgmt.repository.CustomerCaseRepository;
import com.cbs.casemgmt.repository.CaseNoteRepository;
import com.cbs.casemgmt.service.CaseManagementService;
import com.cbs.casemgmt.controller.CaseManagementController;
import com.cbs.common.dto.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseManagementControllerTest {

    @Mock private CaseManagementService caseService;
    @InjectMocks private CaseManagementController controller;

    private CustomerCase buildCase(String caseNumber, String status, String priority) {
        return CustomerCase.builder()
                .id(1L)
                .caseNumber(caseNumber)
                .customerId(100L)
                .customerName("Test Customer")
                .caseType("COMPLAINT")
                .caseCategory("GENERAL")
                .subCategory("Service Quality")
                .priority(priority)
                .status(status)
                .subject("Test subject")
                .description("Test description")
                .assignedTo("agent-1")
                .assignedTeam("Support")
                .slaDueAt(Instant.now().plusSeconds(3600))
                .slaBreached(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test @DisplayName("GET /v1/cases/{caseNumber} returns enriched response with activities")
    void getCaseReturnsActivities() {
        CustomerCase c = buildCase("CASE-001", "OPEN", "HIGH");
        CaseNote note = CaseNote.builder()
                .id(10L).caseId(1L).content("Test note").noteType("INTERNAL").createdBy("admin").createdAt(Instant.now()).build();

        when(caseService.getCase("CASE-001")).thenReturn(c);
        when(caseService.getCaseNotes("CASE-001")).thenReturn(List.of(note));
        when(caseService.resolveDisplayName("agent-1")).thenReturn("Agent One");
        when(caseService.getCaseAttachments(1L)).thenReturn(List.of());

        ResponseEntity<ApiResponse<Map<String, Object>>> resp = controller.getCase("CASE-001");
        assertThat(resp.getStatusCode().value()).isEqualTo(200);

        Map<String, Object> data = resp.getBody().getData();
        assertThat(data.get("caseNumber")).isEqualTo("CASE-001");
        assertThat(data.get("customerName")).isEqualTo("Test Customer");
        assertThat(data.get("subCategory")).isEqualTo("Service Quality");
        assertThat(data.get("assignedToName")).isEqualTo("Agent One");
        assertThat(data.get("openedAt")).isNotNull();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> activities = (List<Map<String, Object>>) data.get("activities");
        assertThat(activities).hasSize(1);
        assertThat(activities.get(0).get("type")).isEqualTo("NOTE");
        assertThat(activities.get(0).get("content")).isEqualTo("Test note");
    }

    @Test @DisplayName("POST /v1/cases creates case and returns 201")
    void createCase() {
        CustomerCase input = CustomerCase.builder()
                .customerId(1L).customerName("New Customer").caseType("DISPUTE")
                .priority("HIGH").subject("Unauthorized charge").build();
        CustomerCase saved = buildCase("CASE-NEW", "OPEN", "HIGH");

        when(caseService.createCase(any())).thenReturn(saved);

        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.openCase(input);
        assertThat(resp.getStatusCode().value()).isEqualTo(201);
        assertThat(resp.getBody().getData().getCaseNumber()).isEqualTo("CASE-NEW");
    }

    @Test @DisplayName("GET /v1/cases returns all cases")
    void listCases() {
        when(caseService.getAllCases()).thenReturn(List.of(
                buildCase("CASE-001", "OPEN", "HIGH"),
                buildCase("CASE-002", "RESOLVED", "LOW")
        ));

        ResponseEntity<ApiResponse<List<CustomerCase>>> resp = controller.listCases(null, null, null, null, null, null, 0, 100);
        assertThat(resp.getBody().getData()).hasSize(2);
    }

    @Test @DisplayName("POST /v1/cases/{caseNumber}/assign assigns case")
    void assignCase() {
        CustomerCase assigned = buildCase("CASE-001", "IN_PROGRESS", "HIGH");
        assigned.setAssignedTo("new-agent");
        when(caseService.assignCase(eq("CASE-001"), eq("new-agent"), eq("Fraud Ops"))).thenReturn(assigned);

        Map<String, String> body = Map.of("assignedTo", "new-agent", "team", "Fraud Ops");
        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.assign("CASE-001", body, null, null);
        assertThat(resp.getBody().getData().getAssignedTo()).isEqualTo("new-agent");
    }

    @Test @DisplayName("POST /v1/cases/{caseNumber}/resolve resolves case")
    void resolveCase() {
        CustomerCase resolved = buildCase("CASE-001", "RESOLVED", "HIGH");
        when(caseService.resolveCase(eq("CASE-001"), eq("Fixed the issue"), eq("FULLY_RESOLVED"), isNull())).thenReturn(resolved);

        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.resolve("CASE-001", "FULLY_RESOLVED", "Fixed the issue");
        assertThat(resp.getBody().getData().getStatus()).isEqualTo("RESOLVED");
    }

    @Test @DisplayName("POST /v1/cases/{caseNumber}/escalate escalates case with reason")
    void escalateCase() {
        CustomerCase escalated = buildCase("CASE-001", "ESCALATED", "CRITICAL");
        when(caseService.escalateCase("CASE-001", "manager@bank.com", "Exceeds threshold")).thenReturn(escalated);

        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.escalate("CASE-001", "manager@bank.com", "Exceeds threshold");
        assertThat(resp.getBody().getData().getStatus()).isEqualTo("ESCALATED");
    }

    @Test @DisplayName("POST /v1/cases/{caseNumber}/close sets status to CLOSED")
    void closeCase() {
        CustomerCase c = buildCase("CASE-001", "RESOLVED", "MEDIUM");
        when(caseService.getCase("CASE-001")).thenReturn(c);
        when(caseService.saveCase(any())).thenAnswer(inv -> inv.getArgument(0));

        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.closeCase("CASE-001", "Customer satisfied");
        assertThat(resp.getBody().getData().getStatus()).isEqualTo("CLOSED");
        assertThat(resp.getBody().getData().getClosedAt()).isNotNull();
    }

    @Test @DisplayName("PUT /v1/cases/{caseNumber} updates case fields")
    void updateCase() {
        CustomerCase existing = buildCase("CASE-001", "OPEN", "MEDIUM");
        when(caseService.getCase("CASE-001")).thenReturn(existing);
        when(caseService.saveCase(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase updates = new CustomerCase();
        updates.setPriority("CRITICAL");
        updates.setSubject("Updated subject");

        ResponseEntity<ApiResponse<CustomerCase>> resp = controller.updateCase("CASE-001", updates);
        assertThat(resp.getBody().getData().getPriority()).isEqualTo("CRITICAL");
        assertThat(resp.getBody().getData().getSubject()).isEqualTo("Updated subject");
    }

    @Test @DisplayName("GET /v1/cases/stats returns statistics map")
    void stats() {
        when(caseService.getAllCases()).thenReturn(List.of(
                buildCase("CASE-001", "OPEN", "HIGH"),
                buildCase("CASE-002", "RESOLVED", "LOW")
        ));
        when(caseService.checkSlaBreaches()).thenReturn(1);

        ResponseEntity<ApiResponse<Map<String, Object>>> resp = controller.stats();
        Map<String, Object> data = resp.getBody().getData();
        assertThat(data.get("openCases")).isEqualTo(1L);
        assertThat(data.get("slaBreached")).isEqualTo(1);
    }

    @Test @DisplayName("POST /v1/cases/{caseNumber}/notes adds note")
    void addNote() {
        CaseNote note = CaseNote.builder().id(1L).caseId(1L).content("SLA update").noteType("INTERNAL").createdBy("admin").build();
        when(caseService.addNote(eq("CASE-001"), eq("SLA update"), eq("INTERNAL"), eq("admin"))).thenReturn(note);

        CaseNote input = new CaseNote();
        input.setContent("SLA update");
        input.setNoteType("INTERNAL");
        input.setCreatedBy("admin");

        ResponseEntity<ApiResponse<CaseNote>> resp = controller.addNote("CASE-001", input);
        assertThat(resp.getStatusCode().value()).isEqualTo(201);
        assertThat(resp.getBody().getData().getContent()).isEqualTo("SLA update");
    }

    @Test @DisplayName("GET /v1/cases/sla-breached returns breached cases")
    void slaBreached() {
        CustomerCase breached = buildCase("CASE-001", "OPEN", "HIGH");
        breached.setSlaBreached(true);
        when(caseService.getSlaBreachedCases()).thenReturn(List.of(breached));

        ResponseEntity<ApiResponse<List<CustomerCase>>> resp = controller.slaBreached();
        assertThat(resp.getBody().getData()).hasSize(1);
        assertThat(resp.getBody().getData().get(0).getSlaBreached()).isTrue();
    }

    @Test @DisplayName("GET /v1/cases/escalated returns escalated cases")
    void escalatedCases() {
        CustomerCase esc = buildCase("CASE-001", "ESCALATED", "CRITICAL");
        when(caseService.getEscalatedCases()).thenReturn(List.of(esc));

        ResponseEntity<ApiResponse<List<CustomerCase>>> resp = controller.escalatedCases();
        assertThat(resp.getBody().getData()).hasSize(1);
        assertThat(resp.getBody().getData().get(0).getStatus()).isEqualTo("ESCALATED");
    }
}
