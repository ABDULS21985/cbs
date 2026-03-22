package com.cbs.casemgmt;

import com.cbs.admin.service.AdminUserService;
import com.cbs.casemgmt.entity.*;
import com.cbs.casemgmt.repository.*;
import com.cbs.casemgmt.service.CaseManagementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CaseManagementServiceTest {

    @Mock private CustomerCaseRepository caseRepository;
    @Mock private CaseNoteRepository noteRepository;
    @Mock private CaseAttachmentRepository attachmentRepository;
    @Mock private AdminUserService adminUserService;
    @InjectMocks private CaseManagementService service;

    @Test @DisplayName("Case creation sets SLA based on priority")
    void createWithSla() {
        when(caseRepository.save(any())).thenAnswer(inv -> { CustomerCase c = inv.getArgument(0); c.setId(1L); return c; });
        CustomerCase c = CustomerCase.builder().customerId(1L).caseType("COMPLAINT").caseCategory("ACCOUNTS")
                .priority("CRITICAL").subject("Payment failed").build();
        CustomerCase result = service.createCase(c);
        assertThat(result.getCaseNumber()).startsWith("CASE-");
        assertThat(result.getSlaDueAt()).isNotNull();
        // CRITICAL = 4 hours SLA
        assertThat(result.getSlaDueAt()).isBefore(java.time.Instant.now().plus(5, java.time.temporal.ChronoUnit.HOURS));
    }

    @Test @DisplayName("Escalation updates priority and reassigns")
    void escalation() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ESC").status("IN_PROGRESS").priority("MEDIUM").build();
        when(caseRepository.findByCaseNumber("CAS-ESC")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalateCase("CAS-ESC", "manager@bank.com");
        assertThat(result.getStatus()).isEqualTo("ESCALATED");
        assertThat(result.getAssignedTo()).isEqualTo("manager@bank.com");
    }

    @Test @DisplayName("Case creation auto-derives caseCategory from caseType when not provided")
    void createDerivesCategoryFromType() {
        when(caseRepository.save(any())).thenAnswer(inv -> { CustomerCase c = inv.getArgument(0); c.setId(2L); return c; });
        CustomerCase c = CustomerCase.builder().customerId(1L).caseType("CARD_ISSUE")
                .priority("MEDIUM").subject("Card blocked").build();
        CustomerCase result = service.createCase(c);
        assertThat(result.getCaseCategory()).isEqualTo("CARDS");
    }

    @Test @DisplayName("Case creation preserves explicitly provided caseCategory")
    void createPreservesExplicitCategory() {
        when(caseRepository.save(any())).thenAnswer(inv -> { CustomerCase c = inv.getArgument(0); c.setId(3L); return c; });
        CustomerCase c = CustomerCase.builder().customerId(1L).caseType("COMPLAINT").caseCategory("DIGITAL")
                .priority("LOW").subject("App crash").build();
        CustomerCase result = service.createCase(c);
        assertThat(result.getCaseCategory()).isEqualTo("DIGITAL");
    }

    @Test @DisplayName("Escalation with reason appends to description")
    void escalationWithReason() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-RSN").status("IN_PROGRESS")
                .priority("MEDIUM").description("Original desc").build();
        when(caseRepository.findByCaseNumber("CAS-RSN")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalateCase("CAS-RSN", "manager@bank.com", "Customer VIP");
        assertThat(result.getDescription()).contains("[Escalation reason]: Customer VIP");
    }

    @Test @DisplayName("Resolve rejects already resolved cases")
    void resolveRejectsAlreadyResolved() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-RES").status("RESOLVED").build();
        when(caseRepository.findByCaseNumber("CAS-RES")).thenReturn(java.util.Optional.of(c));

        assertThatThrownBy(() -> service.resolveCase("CAS-RES", "summary", "FULLY_RESOLVED", null))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class);
    }

    @Test @DisplayName("Add note creates note with correct fields")
    void addNote() {
        CustomerCase c = CustomerCase.builder().id(5L).caseNumber("CAS-NOTE").build();
        when(caseRepository.findByCaseNumber("CAS-NOTE")).thenReturn(java.util.Optional.of(c));
        when(noteRepository.save(any())).thenAnswer(inv -> { CaseNote n = inv.getArgument(0); n.setId(1L); return n; });

        CaseNote result = service.addNote("CAS-NOTE", "Follow-up needed", "INTERNAL", "admin");
        assertThat(result.getContent()).isEqualTo("Follow-up needed");
        assertThat(result.getNoteType()).isEqualTo("INTERNAL");
        assertThat(result.getCaseId()).isEqualTo(5L);
    }

    @Test @DisplayName("Approve compensation sets approved fields")
    void approveCompensation() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-COMP").compensationAmount(BigDecimal.valueOf(50000)).build();
        when(caseRepository.findByCaseNumber("CAS-COMP")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.approveCompensation("CAS-COMP", "manager");
        assertThat(result.getCompensationApproved()).isTrue();
        assertThat(result.getCompensationApprovedBy()).isEqualTo("manager");
        assertThat(result.getCompensationApprovedAt()).isNotNull();
    }

    @Test @DisplayName("Reject compensation sets rejection reason")
    void rejectCompensation() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-REJC").compensationAmount(BigDecimal.valueOf(100000)).build();
        when(caseRepository.findByCaseNumber("CAS-REJC")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.rejectCompensation("CAS-REJC", "manager", "Amount too high");
        assertThat(result.getCompensationApproved()).isFalse();
        assertThat(result.getCompensationRejectionReason()).isEqualTo("Amount too high");
    }

    @Test @DisplayName("Approve compensation fails when no amount set")
    void approveCompensationNoAmount() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-NOAMT").build();
        when(caseRepository.findByCaseNumber("CAS-NOAMT")).thenReturn(java.util.Optional.of(c));

        assertThatThrownBy(() -> service.approveCompensation("CAS-NOAMT", "manager"))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class);
    }

    @Test @DisplayName("resolveDisplayName falls back to username when Keycloak unavailable")
    void resolveDisplayNameFallback() {
        when(adminUserService.getUsernameIndex()).thenReturn(java.util.Map.of());
        String result = service.resolveDisplayName("agent-1");
        assertThat(result).isEqualTo("agent-1");
    }

    @Test @DisplayName("resolveDisplayName returns full name from Keycloak")
    void resolveDisplayNameKeycloak() {
        java.util.Map<String, Object> kcUser = java.util.Map.of("firstName", "Jane", "lastName", "Smith", "username", "jane.smith");
        when(adminUserService.getUsernameIndex()).thenReturn(java.util.Map.of("agent-1", kcUser));
        String result = service.resolveDisplayName("agent-1");
        assertThat(result).isEqualTo("Jane Smith");
    }

    // ── Keycloak display name resolution edge cases ─────────────────────

    @Test @DisplayName("resolveDisplayName returns null for null username")
    void resolveDisplayNameNull() {
        String result = service.resolveDisplayName(null);
        assertThat(result).isNull();
    }

    @Test @DisplayName("resolveDisplayName returns null for blank username")
    void resolveDisplayNameBlank() {
        String result = service.resolveDisplayName("   ");
        assertThat(result).isNull();
    }

    @Test @DisplayName("resolveDisplayName falls back when Keycloak throws exception")
    void resolveDisplayNameException() {
        when(adminUserService.getUsernameIndex()).thenThrow(new RuntimeException("Keycloak unavailable"));
        String result = service.resolveDisplayName("agent-1");
        assertThat(result).isEqualTo("agent-1");
    }

    @Test @DisplayName("resolveDisplayName handles user with only firstName")
    void resolveDisplayNameFirstNameOnly() {
        java.util.Map<String, Object> kcUser = new java.util.HashMap<>();
        kcUser.put("firstName", "Jane");
        kcUser.put("lastName", null);
        when(adminUserService.getUsernameIndex()).thenReturn(java.util.Map.of("agent-1", kcUser));
        String result = service.resolveDisplayName("agent-1");
        assertThat(result).isEqualTo("Jane");
    }

    @Test @DisplayName("resolveDisplayName falls back when user has no name fields")
    void resolveDisplayNameNoNameFields() {
        java.util.Map<String, Object> kcUser = new java.util.HashMap<>();
        kcUser.put("firstName", null);
        kcUser.put("lastName", null);
        when(adminUserService.getUsernameIndex()).thenReturn(java.util.Map.of("agent-1", kcUser));
        String result = service.resolveDisplayName("agent-1");
        assertThat(result).isEqualTo("agent-1");
    }

    @Test @DisplayName("resolveDisplayName is case-insensitive for username lookup")
    void resolveDisplayNameCaseInsensitive() {
        java.util.Map<String, Object> kcUser = java.util.Map.of("firstName", "Jane", "lastName", "Smith");
        when(adminUserService.getUsernameIndex()).thenReturn(java.util.Map.of("agent-1", kcUser));
        String result = service.resolveDisplayName("Agent-1");
        assertThat(result).isEqualTo("Jane Smith");
    }

    // ── SLA breach detection ─────────────────────────────────────────────

    @Test @DisplayName("checkSlaBreaches marks overdue cases as breached")
    void checkSlaBreachesMarksCases() {
        CustomerCase c1 = CustomerCase.builder().id(1L).caseNumber("CAS-SLA1").status("OPEN")
                .slaDueAt(java.time.Instant.now().minus(1, java.time.temporal.ChronoUnit.HOURS)).slaBreached(false).build();
        CustomerCase c2 = CustomerCase.builder().id(2L).caseNumber("CAS-SLA2").status("IN_PROGRESS")
                .slaDueAt(java.time.Instant.now().minus(2, java.time.temporal.ChronoUnit.HOURS)).slaBreached(false).build();

        when(caseRepository.findSlaBreachCandidates()).thenReturn(java.util.List.of(c1, c2));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        int count = service.checkSlaBreaches();

        assertThat(count).isEqualTo(2);
        assertThat(c1.getSlaBreached()).isTrue();
        assertThat(c2.getSlaBreached()).isTrue();
        verify(caseRepository, times(2)).save(any());
    }

    @Test @DisplayName("checkSlaBreaches returns zero when no breaches found")
    void checkSlaBreachesNone() {
        when(caseRepository.findSlaBreachCandidates()).thenReturn(java.util.List.of());

        int count = service.checkSlaBreaches();

        assertThat(count).isEqualTo(0);
        verify(caseRepository, never()).save(any());
    }

    @Test @DisplayName("getSlaBreachedCases calls checkSlaBreaches first then returns breached list")
    void getSlaBreachedCasesChecksFirst() {
        when(caseRepository.findSlaBreachCandidates()).thenReturn(java.util.List.of());
        CustomerCase breached = CustomerCase.builder().id(1L).caseNumber("CAS-B1").slaBreached(true).build();
        when(caseRepository.findSlaBreachedCases()).thenReturn(java.util.List.of(breached));

        java.util.List<CustomerCase> result = service.getSlaBreachedCases();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSlaBreached()).isTrue();
        // Verify checkSlaBreaches was invoked (via findSlaBreachCandidates)
        verify(caseRepository).findSlaBreachCandidates();
        verify(caseRepository).findSlaBreachedCases();
    }

    // ── File upload/download ─────────────────────────────────────────────

    @Test @DisplayName("uploadAttachment saves file and returns metadata with checksum")
    void uploadAttachment() throws Exception {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ATT").build();
        when(caseRepository.findByCaseNumber("CAS-ATT")).thenReturn(java.util.Optional.of(c));
        when(attachmentRepository.save(any())).thenAnswer(inv -> {
            CaseAttachment a = inv.getArgument(0);
            a.setId(10L);
            return a;
        });

        org.springframework.mock.web.MockMultipartFile mockFile =
                new org.springframework.mock.web.MockMultipartFile(
                        "file", "receipt.pdf", "application/pdf",
                        "PDF content here".getBytes());

        CaseAttachment result = service.uploadAttachment("CAS-ATT", mockFile, "agent-1");

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getCaseId()).isEqualTo(1L);
        assertThat(result.getOriginalFilename()).isEqualTo("receipt.pdf");
        assertThat(result.getFileSize()).isEqualTo(mockFile.getSize());
        assertThat(result.getMimeType()).isEqualTo("application/pdf");
        assertThat(result.getUploadedBy()).isEqualTo("agent-1");
        assertThat(result.getChecksum()).isNotNull().isNotBlank();
        assertThat(result.getStoragePath()).contains("CAS-ATT");
        // Verify file was written to disk
        assertThat(java.nio.file.Files.exists(java.nio.file.Path.of(result.getStoragePath()))).isTrue();
        // Clean up
        java.nio.file.Files.deleteIfExists(java.nio.file.Path.of(result.getStoragePath()));
    }

    @Test @DisplayName("uploadAttachment rejects null file")
    void uploadAttachmentNullFile() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ATT2").build();
        when(caseRepository.findByCaseNumber("CAS-ATT2")).thenReturn(java.util.Optional.of(c));

        assertThatThrownBy(() -> service.uploadAttachment("CAS-ATT2", null, "agent-1"))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class)
                .hasMessageContaining("File is required");
    }

    @Test @DisplayName("uploadAttachment rejects empty file")
    void uploadAttachmentEmptyFile() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ATT3").build();
        when(caseRepository.findByCaseNumber("CAS-ATT3")).thenReturn(java.util.Optional.of(c));

        org.springframework.mock.web.MockMultipartFile emptyFile =
                new org.springframework.mock.web.MockMultipartFile("file", "", "text/plain", new byte[0]);

        assertThatThrownBy(() -> service.uploadAttachment("CAS-ATT3", emptyFile, "agent-1"))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class)
                .hasMessageContaining("File is required");
    }

    @Test @DisplayName("uploadAttachment sanitizes filename with special characters")
    void uploadAttachmentSanitizesFilename() throws Exception {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-ATT4").build();
        when(caseRepository.findByCaseNumber("CAS-ATT4")).thenReturn(java.util.Optional.of(c));
        when(attachmentRepository.save(any())).thenAnswer(inv -> {
            CaseAttachment a = inv.getArgument(0);
            a.setId(11L);
            return a;
        });

        org.springframework.mock.web.MockMultipartFile mockFile =
                new org.springframework.mock.web.MockMultipartFile(
                        "file", "my receipt (1).pdf", "application/pdf", "data".getBytes());

        CaseAttachment result = service.uploadAttachment("CAS-ATT4", mockFile, "agent-1");

        assertThat(result.getOriginalFilename()).isEqualTo("my_receipt__1_.pdf");
        // Clean up
        java.nio.file.Files.deleteIfExists(java.nio.file.Path.of(result.getStoragePath()));
    }

    @Test @DisplayName("downloadAttachment returns file bytes for existing attachment")
    void downloadAttachment() throws Exception {
        // Write a temp file first
        java.nio.file.Path dir = java.nio.file.Path.of("build", "document-store", "case-attachments", "CAS-DL");
        java.nio.file.Files.createDirectories(dir);
        java.nio.file.Path file = dir.resolve("test-file.pdf");
        java.nio.file.Files.write(file, "PDF binary content".getBytes());

        CaseAttachment att = CaseAttachment.builder().id(20L).storagePath(file.toAbsolutePath().toString()).build();
        when(attachmentRepository.findById(20L)).thenReturn(java.util.Optional.of(att));

        byte[] result = service.downloadAttachment(20L);

        assertThat(new String(result)).isEqualTo("PDF binary content");
        // Clean up
        java.nio.file.Files.deleteIfExists(file);
    }

    @Test @DisplayName("downloadAttachment throws when attachment not found in DB")
    void downloadAttachmentNotFound() {
        when(attachmentRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.downloadAttachment(999L))
                .isInstanceOf(com.cbs.common.exception.ResourceNotFoundException.class);
    }

    @Test @DisplayName("downloadAttachment throws when file missing from disk")
    void downloadAttachmentFileMissing() {
        CaseAttachment att = CaseAttachment.builder().id(21L)
                .storagePath("/nonexistent/path/file.pdf").build();
        when(attachmentRepository.findById(21L)).thenReturn(java.util.Optional.of(att));

        assertThatThrownBy(() -> service.downloadAttachment(21L))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class)
                .hasMessageContaining("not found on disk");
    }

    // ── Compensation edge cases ──────────────────────────────────────────

    @Test @DisplayName("setCompensation resets approval fields")
    void setCompensationResetsApproval() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-SETC")
                .compensationAmount(java.math.BigDecimal.valueOf(10000))
                .compensationApproved(true)
                .compensationApprovedBy("old-admin")
                .compensationApprovedAt(java.time.Instant.now())
                .build();
        when(caseRepository.findByCaseNumber("CAS-SETC")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.setCompensation("CAS-SETC", java.math.BigDecimal.valueOf(75000));

        assertThat(result.getCompensationAmount()).isEqualByComparingTo(java.math.BigDecimal.valueOf(75000));
        assertThat(result.getCompensationApproved()).isNull();
        assertThat(result.getCompensationApprovedBy()).isNull();
        assertThat(result.getCompensationApprovedAt()).isNull();
        assertThat(result.getCompensationRejectionReason()).isNull();
    }

    @Test @DisplayName("approveCompensation rejects already-approved case")
    void approveCompensationAlreadyApproved() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-AA")
                .compensationAmount(java.math.BigDecimal.valueOf(50000))
                .compensationApproved(true).build();
        when(caseRepository.findByCaseNumber("CAS-AA")).thenReturn(java.util.Optional.of(c));

        assertThatThrownBy(() -> service.approveCompensation("CAS-AA", "admin"))
                .isInstanceOf(com.cbs.common.exception.BusinessException.class)
                .hasMessageContaining("already approved");
    }

    @Test @DisplayName("Escalation bumps MEDIUM priority to HIGH")
    void escalationMediumToHigh() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-PRI1").status("IN_PROGRESS")
                .priority("MEDIUM").build();
        when(caseRepository.findByCaseNumber("CAS-PRI1")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalateCase("CAS-PRI1", "manager@bank.com");
        assertThat(result.getPriority()).isEqualTo("HIGH");
        assertThat(result.getSlaDueAt()).isNotNull();
    }

    @Test @DisplayName("Escalation bumps HIGH priority to CRITICAL")
    void escalationHighToCritical() {
        CustomerCase c = CustomerCase.builder().id(1L).caseNumber("CAS-PRI2").status("IN_PROGRESS")
                .priority("HIGH").build();
        when(caseRepository.findByCaseNumber("CAS-PRI2")).thenReturn(java.util.Optional.of(c));
        when(caseRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CustomerCase result = service.escalateCase("CAS-PRI2", "manager@bank.com");
        assertThat(result.getPriority()).isEqualTo("CRITICAL");
    }
}
