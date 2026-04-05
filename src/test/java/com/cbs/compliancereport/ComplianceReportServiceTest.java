package com.cbs.compliancereport;

import com.cbs.common.exception.BusinessException;
import com.cbs.compliancereport.entity.ComplianceReport;
import com.cbs.compliancereport.repository.ComplianceReportRepository;
import com.cbs.compliancereport.service.ComplianceReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComplianceReportServiceTest {

    @Mock
    private ComplianceReportRepository repository;

    @Mock
    private com.cbs.common.audit.CurrentActorProvider currentActorProvider;

    @InjectMocks
    private ComplianceReportService service;

    @Test
    @DisplayName("Submit rejects non-REVIEWED reports")
    void submitRejectsNonReviewedReports() {
        ComplianceReport report = new ComplianceReport();
        report.setId(1L);
        report.setReportCode("CR-TEST00001");
        report.setStatus("DRAFT");

        when(repository.findByReportCode("CR-TEST00001")).thenReturn(Optional.of(report));

        assertThatThrownBy(() -> service.submit("CR-TEST00001", "REF-001"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("must be REVIEWED");
    }

    @Test
    @DisplayName("Review sets reviewedBy and timestamp")
    void reviewSetsReviewedByAndTimestamp() {
        ComplianceReport report = new ComplianceReport();
        report.setId(1L);
        report.setReportCode("CR-TEST00002");
        report.setStatus("PREPARED");

        when(repository.findByReportCode("CR-TEST00002")).thenReturn(Optional.of(report));
        when(repository.save(any(ComplianceReport.class))).thenAnswer(i -> i.getArgument(0));

        ComplianceReport result = service.review("CR-TEST00002", "John Auditor");

        assertThat(result.getStatus()).isEqualTo("REVIEWED");
        assertThat(result.getReviewedBy()).isEqualTo("John Auditor");
        assertThat(result.getReviewedAt()).isNotNull();
    }
}
